//Shows and hides the number of trials and partial/mostly charged thresholds
function toggleAdvanced(){
  var iterations = document.getElementById('iterationsBox');
  var thresh = document.getElementById('threshBox');
  if (iterations.style.display == "block"){
    iterations.style.display = "none";
  }
  else{iterations.style.display = "block";}

  if (thresh.style.display == "block"){
    thresh.style.display = "none";
  }
  else{thresh.style.display = "block";}
}

//Changes the currently displayed algorithm results on the graph
function view(algorithmType){
  resetGraphs(); //Clears existing graph
  graph(resultsLine[algorithmType][0],resultsLine[algorithmType][1]); //Takes the stored data for whatever algorithm has been selected and populates the line graph with it
  pieChart(resultsPie[algorithmType][0],resultsPie[algorithmType][1],resultsPie[algorithmType][2],resultsPie[algorithmType][3]); //same for pie chart
  var displayedString = "Current Algorithm: ";
  var element = document.getElementById('AlgorithmDisplayer'); //Changes the title to inform user what is currently displayed
  if (algorithmType == 0){
    displayedString += "Greedy Allocation";
  }
  else if (algorithmType == 1){
    displayedString += "Equal Contention";
  }
  else{
    displayedString += "Value Density";
  }
  element.innerHTML = displayedString;

}

function submit(){ //Submits the user's form

  //This section reads the input data, validates & converts where necessary and parameterizes them to be passed onto another function
  var houses = document.getElementById("houses").value;
  var penetration = document.getElementById('penetration').value;
  penetration = penetration / 100; //e.g. 120% -> 1.2 multiplier later
  penetration = Math.min(200, penetration); //Higher than this can cause big slowdowns and don't produce meaningful graphs
  var capacity = document.getElementById('capacity').value;
  if (capacity < 100){
    alert("Capacity must be over 100 to allow for the baseline energy consumption.");
    return; //Prevents submission if capacity < 100
  }
  var chargeRate = document.getElementById('chargerate').value;
  chargeRate = chargeRate * 36 / numberOfPeriods; //scales hours to periods
  var iterations = document.getElementById('iterations').value;
  iterations = Math.min(300/penetration, iterations); //Too high can cause freezing
  var carCount = Math.round(houses * penetration * 1.5); //*1/5 because adding another 6h before and after model. May result in not 100% of cars being displayed on graph, however this is not discernable from frontend.
  pieChartThreshold = 1 - (document.getElementById('thresh').value / 100);

  successfulFuels = 0; //Holds current success/etc. values for the current model. Could be made local but not of huge importance.
  partialSuccessfulFuels = 0;
  unsuccessfulFuels = 0;
  failedFuels = 0;
  scaledBaseLoad = baseLoad(houses); //Scales the baseload energy usage (i.e. without EVs) based on number of houses in the neighbourhood
  scaledMax = Math.max.apply(null,scaledBaseLoad);
  maximumCapacity = (capacity / 100) * scaledMax; //Calculates maximum capacity based on user input and maximum base load figure.

  resetGraphs();

  buildModel(carCount, capacity, chargeRate, iterations);
  view(0); //populates chart with greedy by default
  document.getElementById("button1").style.visibility='visible'; //Allows user to toggle between graphs, is hidden when no data available
  document.getElementById("button2").style.visibility='visible';
  document.getElementById("button3").style.visibility='visible';

}

//Removes old charts
function resetGraphs(){
  var count;
  for (count = chartsList.length -1; count > -1; count--){
    chartsList[count].destroy();
  }
  chartsList = [];
}

//Populates graphs with empty data on startup
function loaded(){
  graph([]);
  pieChart([],[],[],[]);
}

/* THE MODEL
This consists of a list of numbers determined by 'numberofPeriods'
The number at each period is the number of cars that will arrive at that point
Cars are randomly generated with required electricity and time remaining, and are also stored in a List
They are taken from the list in index order
 */
var numberOfPeriods = 72; //36 hours NOTE: Most of the code was written for this to be flexible, but some new code may not work with the new 36 hour system.
var successfulFuels = 0; //Fully fuelled
var partialSuccessfulFuels = 0; // >50% fuelled
var unsuccessfulFuels = 0; // 0<x<50% fuelled
var failedFuels = 0; //not fuelled at all
var chartsList = [];
var scaledBaseLoad = [];
var scaledMax = 0;
var maximumCapacity = 0;
var pieChartThreshold = 50;
var resultsLine = [-1,-1,-1]; //Holds the results from the 3 algorithms
var resultsPie = [-1,-1,-1];
var tempResultsLine = [];
var tempResultsPie = [];

//Creates the cars and when they will arrive by. Acts as a hub from which simulations are run, allowing us to track performance, take averages, etc.
function buildModel(cars, capacity, chargeRate, iterations){
  var count;
  var carCount;
  carCount = 0;
  var timeCount;
  var carsList = [];
  var carsTimeList = [];
  //populates the carsTimeList with a 0 for each time period
  for (timeCount = 0; timeCount < numberOfPeriods; timeCount++){
    carsTimeList.push(0);
  }
  //increments values in the array. E.g. a value of 3 at index 25 means 3 cars will spawn during time period 25.
  for(carCount = 0; carCount < cars; carCount++){
    period = createStartTime();
    carsTimeList[period]++;
  }
  //Creates a set of cars with electricity needs and maximum waiting time, based on charge rate and the time at which they arrive.
  for(carCount = 0; carCount < carsTimeList.length; carCount++){
    for (temp = 0; temp < carsTimeList[carCount]; temp++){
      var car = createCar(chargeRate, carCount);
      carsList.push(car);
    }
  }

  //for each algorithm, runs a number of simulations based on the number of iterations required.
  var algorithmType;
  for(algorithmType = 0; algorithmType < 3; algorithmType++){
    tempResultsLine = [];
    tempResultsPie = [];
    for (count = 0; count < iterations; count++){
      var carsListClone = JSON.parse(JSON.stringify(carsList)); //Performs a deep clone of the cars list so each simulation gets an independent list.
      runModel(carsTimeList, capacity, chargeRate, carsListClone, algorithmType);
    }
    averageResults(algorithmType);
  }

}

//Finds the mean results and stores them in a global variable, resultsLine and resultsPie
function averageResults(algorithmType){
  var count;
  var elecUsageList = tempResultsLine[0][0]; //Retrieves the data stored temporatily in a global variable
  var overLimitList = tempResultsLine[0][1];
  var iterations = tempResultsLine.length;
  for (count = 1; count < iterations; count++){
    var listCount;
    for (listCount = 0; listCount < 48; listCount++){ //48 as only periods 12-60 count
      elecUsageList[listCount] += tempResultsLine[count][0][listCount]; //sums all the values for each time period
      overLimitList[listCount] += tempResultsLine[count][1][listCount];
    }
  }
  elecUsageList = elecUsageList.map(function(x){ //finds mean by dividing the sums by the number of elements
    return x / iterations;
  });
  overLimitList = overLimitList.map(function(x){
    return x / iterations;
  });

  var avgSuccess = 0;
  var avgPartial = 0;
  var avgUnsuccess = 0;
  var avgFail = 0;

  //As previous, sums the results and divides to find mean.
  for (count = 0; count < iterations; count++){
    avgSuccess += tempResultsPie[count][0];
    avgPartial += tempResultsPie[count][1];
    avgUnsuccess += tempResultsPie[count][2];
    avgFail += tempResultsPie[count][3];
  }
  avgSuccess = avgSuccess / iterations;
  avgPartial = avgPartial / iterations;
  avgUnsuccess = avgUnsuccess / iterations;
  avgFail = avgFail / iterations;

  //sum is used to convert the 4 sections into percentages.
  var sum = (avgSuccess+avgPartial+avgUnsuccess+avgFail)/100;


  var avgLineResult =[elecUsageList, overLimitList];
  var avgPieResult = [Math.round(avgSuccess/sum), Math.round(avgPartial/sum), Math.round(avgUnsuccess/sum), Math.round(avgFail/sum)];

  resultsLine[algorithmType] = avgLineResult;
  resultsPie[algorithmType] = avgPieResult;
}

//runs one instance of the simulation
function runModel(carsTimeList, capacity, chargeRate, carsList, algorithmType){
  var timeStep;
  var currentCars = [];
  var electricityUsageOverTime = [];
  var car;

  for (timeStep = 0; timeStep < numberOfPeriods; timeStep++){
    //Adds cars that should arrive at this time step
    var carsToAdd = carsTimeList[timeStep];
    for (carsToAdd; carsToAdd > 0; carsToAdd--){
      currentCars.push(carsList.shift());
    }
    //Finds the base energy consumption at this time
    var baseLoadUsage = getScaledBaseLoad(timeStep-12); //-12 to allow for the first 6 hours
    var availableElec = maximumCapacity - baseLoadUsage; //Finds all electricity that can be allocated to EVs
    var electricityUsed = 0;
    var carCounter;

    //Runs the desired algorith. 0=greedy, 1=fairContention, 2=valueMax
    if (algorithmType == 2){

      //calculates value density for all cars
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){
        car = currentCars[carCounter];
        car.density = valueDensity(car.remainingElectricity, car.timeRemaining, chargeRate, car).toFixed(4);
      }
      //Prioritises based on value density, or time remaining if tie.
      currentCars.sort(function (car1, car2) {
        return car1.density < car2.density ? -1 : car1.density == car2.density ? car1.timeRemaining > car2.timeRemaining ? 1 : -1 : 1;
      });
      carCounter = 0;
      //charges each car
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){ //going backwards allows removal of elements mid-loop without affecting index
        car = currentCars[carCounter];
        //console.log(currentCars[carCounter].density + "t="+currentCars[carCounter].timeRemaining); //for verification of correct ordering
        //Gives electricity to the car based on the smallest of the parameters.
        var electricityAllocatedThisCar = Math.min(chargeRate, availableElec, car.remainingElectricity);
        electricityUsed += electricityAllocatedThisCar; //Car only uses electricity up to its capacity
        car.remainingElectricity -= electricityAllocatedThisCar;
        //Reduces remaining electricity available in this time period
        availableElec -= electricityAllocatedThisCar;

        //checks if car is fully charged or ran out of time
        if(carLeaving(car)){
          currentCars.splice(carCounter, 1); //removes this car if fuelled or out of time
        }
      }
      //records how much EV electricity has been used at this timestep
      electricityUsageOverTime.push(electricityUsed);
    }

    else{ //for greedy or fairContention algorithms
      //All cars get same amount in these algorithms, so can calculate it early
      //Otherwise similar to above
      var electricityPerCar = allocateElectricity(currentCars.length, availableElec, chargeRate, algorithmType);
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){ //allows splicing mid-loop
        car = currentCars[carCounter];
        electricityUsed += Math.min(electricityPerCar, car.remainingElectricity); //Car only uses electricity up to its capacity
        car.remainingElectricity -= electricityPerCar;
        if(carLeaving(car)){
          currentCars.splice(carCounter, 1); //removes this car if fuelled or out of time
        }
      }
      electricityUsageOverTime.push(electricityUsed);
    }
  }
  var carCount;
  //Removes any remaining cars at the end.
  for (carCount = 0; carCount < currentCars.length; carCount++){
    var car = currentCars[carCount];
    car.timeRemaining = 0;
    carLeaving(car);
  }
  outputResults(electricityUsageOverTime);
}

//Allocates electricity for the greedy and fairContention algorithms
function allocateElectricity(numCars, availableElec, chargeRate, algorithmType){
  if (algorithmType == 0){
    return chargeRate; //greedy
  }
  else return Math.min(chargeRate, (availableElec / numCars)); //equal contention
}

//calculates density in the valueDensity algorithm
function valueDensity(amountNeeded, timeToDeparture, chargeRate, car){
  var denominator = (timeToDeparture+1) * chargeRate;
  return amountNeeded / denominator;
}

//Checks if can be removed & if satisfied
function carLeaving(car){
  car.timeRemaining--;
  if (car.remainingElectricity <= 0){ //car is fully fuelled
    //Prevents cars that spawn outside of the graphing time from being included in the pie chart.
    if (car.timeArrived > 12 && car.timeArrived < 60){
      successfulFuels++;
    }
    return true;
  }
  else if (car.timeRemaining <= 0){ //car has ran out of time
    if (car.timeArrived > 12 && car.timeArrived < 60){

      var percentageLeft = car.remainingElectricity / car.electricityRequirement;
      if (percentageLeft < pieChartThreshold){
        partialSuccessfulFuels++; //car is mostly fuelled
      }
      else if (percentageLeft == 1){
        failedFuels++; //car received no fuelling at all
      }
      else{
        unsuccessfulFuels++; //car received less than half of fuel
      }
    }
    return true;
  }
  return false; //car is not yet ready to leave
}

//Stores data at the end of each simulation
function outputResults(electricityUsageOverTime){
  electricityUsageOverTime.splice(0, 12);
  electricityUsageOverTime.splice(electricityUsageOverTime.length-12, 12); //discards all data not in the 24 hour period from 12am-12am
  var count;
  var overLimit = [];
  for (count = 0; count < electricityUsageOverTime.length; count++){
    //Calculates energy usage above maximum capacity
    var amountOver = (electricityUsageOverTime[count] + getScaledBaseLoad(count)) - maximumCapacity; //-ve for all under capacity values
    overLimit.push(Math.max(0, amountOver));
    if(amountOver > 0){
      electricityUsageOverTime[count] -= amountOver; //allows for stacked graph to show correct value, will show in blue EV usage below capacity
    }
  }
  var graphResults = [electricityUsageOverTime, overLimit];
  //stores results in global variable
  tempResultsLine.push(graphResults);

  var pieResults = [successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels];
  tempResultsPie.push(pieResults);

  //resets variables for the next simulation
  successfulFuels = 0;
  partialSuccessfulFuels = 0;
  unsuccessfulFuels = 0;
  failedFuels = 0;
}

//Retrieves the base energy consumption at any given time period
function getScaledBaseLoad(count){
  if (count < 0){ //wraps around for the first and last 6 hours, as the hardcoded data only goes from 12am(index 0)-12am(index 47)
    count += scaledBaseLoad.length;
  }
  if (count >= scaledBaseLoad.length){
    count -= scaledBaseLoad.length;;
  }
  return scaledBaseLoad[count];
}

//Randomly generates cars based on data taken from the Strathclyde PhD
function createCar(chargeRate, timeStep){
  var car = new Object();
  //Cars will have different allowable waiting times based on when they arrive, see the function definition.
  car.timeRemaining = createTimeRequirement(timeStep-12);
  var maxElectricityPossible = car.timeRemaining * chargeRate; //prevents needing more electricity than is possible
  //Store the total required and amount remaining for the valueDensity algorithm.
  car.electricityRequirement = Math.min(createElectricityRequirement(), maxElectricityPossible);
  car.remainingElectricity = car.electricityRequirement;
  car.timeArrived = timeStep;
  return car;
}

//This may benefit from relying on more robust data. We assume most journeys will use at least 5 units, and won't use the full capacity. Assuming old Nissan Leaf model, has ~24 unit capacity
function createElectricityRequirement(){
  return 4 + Math.ceil(Math.random()*16); //uniform between 5 and 20 units
}

//Cars have different waiting times based on when they arrive. E.g. cars that arrive after work at 6pm can take 14 hours to charge ready for work at 8am the day after.
function createTimeRequirement(count){
  //As previous, converts 36 hour system to work with 24 hour data
  if (count < 0){
    count += scaledBaseLoad.length;
  }
  if (count >= scaledBaseLoad.length){
    count -= scaledBaseLoad.length;;
  }
  //From the PhD data, roughly 50/50 chance of a car being used within a short (1-3 hours) or long (5-24) time after arriving at home
  if (Math.random() < 0.5){
    return gaussianRandom(2, 6); //Short 1-3hour, arrival time independent
  }
  else{
    var distrib = [16,14,12,12,10,10,10,14,48,46,46,44,40,38,36,34,32,30,28,26,24,22,20,18]; //long time, depends on when arrives. Values are MAXIMUM wait time
    count = Math.floor(count/2); //Converts half hour times to the hour before. 16:30 -> 16:00
    maxTime = distrib[count];
    return gaussianRandom(maxTime-8, maxTime); //Avg spread of 4 hours, or 8 periods
  }
}


function createStartTime(){
  //These are relative likelihoods of a car arriving at any particular hour.
  //NB assume 6pm-6am 36 hours later, so 1/6th come before, 1/6th come after
    var timeDistrib = [0.36,0.22,0.17,0.11,0.1,0.07, //6pm-11pm day before
            0.02,0.01,0.01,0.01,0.01,0.01,0.01, //12-6
            0.03,0.05,0.12,0.09,0.09,0.11, //7-12
            0.12,0.15,0.11,0.17,0.22,0.36, //1-6
            0.22,0.17,0.11,0.1,0.07, //7-11
            0.02,0.01,0.01,0.01,0.01,0.01]; //12am-6am (excl.) day after
  //Double the index as we only have 24 hour breakdown of charge start times
  //+1 half the time to get hour:30
  var index = 2 * sample(timeDistrib);
  if (Math.random() > 0.5){
    index++;
  }
  return index;
}

//From https://stackoverflow.com/a/39187274. Always called from within gaussianRandom, which bounds the result
function gaussianRand() {
  var gaussianStrength = 10; //higher = more gaussian shape but worse performance
  var rand = 0;
  for (var i = 0; i < gaussianStrength; i += 1) {
    rand += Math.random();
  }
  return rand / gaussianStrength;
}

//Note: pretty sure this is lower and upper bound inclusive
//Returns gaussian distributed value between two bounds.
function gaussianRandom(start, end) {
  return Math.floor(start + gaussianRand() * (end - start + 1));
}

//Feeds input data to be displayed in the line graph. See complexGraph.js
function graph(electricityUsageOverTime, overLimit){
  var periodList = ["00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30","04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"];
  var chart = stackedLineChart(scaledBaseLoad, electricityUsageOverTime, periodList, overLimit);
  chartsList.push(chart);
}

function pieChart(successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels){
  var ctx = document.getElementById('pieChart').getContext('2d');
  var chart = new Chart(ctx, {
  // The type of chart we want to create. Doughnut is just pie with centre removed. Purely aesthetic.
  type: 'doughnut',
  // The data for our dataset
  data: {
      labels: ['Full Charge', 'Mostly Charged', 'Partial Charge', 'Uncharged'],
      datasets: [{
        data: [successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels], //data is passed in here. There are all integers.
                    backgroundColor: ["#22FF22", "#99FF99","#FF9999", "#FF2222"] //assigns a colour to each dataset
      }]
  },

  // Configuration options go here
  options: {responsive:true}
});
chartsList.push(chart);
}

//Calculates baseline energy consumption without EVs
function baseLoad(houses){
  //x1000 for megawatt -> kilowatt conversion
  var scale = 1000 * houses/1885; //1885 is the houses in the dataset
  //for the 1885 neighbourhood
  var baseLoadTimes = [0.61,0.55,0.49,0.44,0.42,0.40,0.40,0.39,0.38,0.40,0.42,0.49,0.57,0.72,0.98,1.18,1.16,1.07,1.00,0.96,0.92,0.88,0.85,0.84,0.93,0.93,0.84,0.75,0.74,0.80,0.84,0.98,1.16,1.44,1.66,1.74,1.74,1.71,1.65,1.57,1.50,1.47,1.46,1.37,1.28,1.14,0.94,0.77];
  var scaled = baseLoadTimes.map(function(x){
    var noiseFactor = 0.90 + (gaussianRand(0, 20) / 10); //adds +-10% max noise to the baseload.
    x = x * noiseFactor;
    return x * scale; }); //Scales based on number of houses
  return scaled;
}

//From https://gist.github.com/brannondorsey/dc4cfe00d6b124aebd3277159dcbdb14
// draw a discrete sample (index) from a probability distribution (an array of probabilities)
// probs will be rescaled to sum to 1.0 if the values do not already
function sample(probs) {
  var sum = probs.reduce(function (a, b) {
    return a + b;
  }, 0);
  if (sum <= 0) throw Error('probs must sum to a value greater than zero');
  var normalized = probs.map(function (prob) {
    return prob / sum;
  });
  var sample = Math.random();
  var total = 0;
  var i;
  for ( i = 0; i < normalized.length; i++) {
      total += normalized[i];
      if (sample < total) return i;
  }
}
