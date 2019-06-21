var imported = document.createElement("script");
imported.src = "complexGraph.js";
document.getElementsByTagName("head")[0].appendChild(imported);

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

  //DISCUSSION: should 0.05 -> 0? 0.99 -> 1?
}

function view(algorithmType){
  resetGraphs();
  graph(resultsLine[algorithmType][0],resultsLine[algorithmType][1]);
  pieChart(resultsPie[algorithmType][0],resultsPie[algorithmType][1],resultsPie[algorithmType][2],resultsPie[algorithmType][3]);
  var displayedString = "Current Algorithm: ";
  var element = document.getElementById('AlgorithmDisplayer');
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

function submit(){
  var houses = document.getElementById("houses").value;
  var penetration = document.getElementById('penetration').value;
  penetration = penetration / 100;
  penetration = Math.min(200, penetration);
  var capacity = document.getElementById('capacity').value;
  var chargeRate = document.getElementById('chargerate').value;
  chargeRate = chargeRate * 36 / numberOfPeriods; //scales hours to periods
  var iterations = document.getElementById('iterations').value;
  iterations = Math.min(300/penetration, iterations);
  var carCount = Math.round(houses * penetration * 1.5); //*1/5 because adding another 6h before and after model. It's not incredibly precise but it doesn't have to be
  pieChartThreshold = 1 - (document.getElementById('thresh').value / 100);


  successfulFuels = 0; //resets outcome
  partialSuccessfulFuels = 0;
  unsuccessfulFuels = 0;
  failedFuels = 0;
  scaledBaseLoad = baseLoad(houses);
  scaledMax = Math.max.apply(null,scaledBaseLoad);
  maximumCapacity = (capacity / 100) * scaledMax;

  resetGraphs();

  buildModel(carCount, capacity, chargeRate, iterations);
  view(0); //populates chart with greedy
  document.getElementById("button1").style.visibility='visible';
  document.getElementById("button2").style.visibility='visible';
  document.getElementById("button3").style.visibility='visible';

}

function resetGraphs(){
  var count; //Removes old charts
  for (count = chartsList.length -1; count > -1; count--){
    chartsList[count].destroy();
  }
  chartsList = [];
}

function loaded(){
  graph([]);
  pieChart([],[],[],[]);
}

/* THE MODEL
This consists of a list of numbers determined by 'numberofPeriods' (48 is one per half hour period)
The number at each period is the number of cars that will arrive at that point
Cars are randomly generated with required electricity and time remaining, and are also stored in a List
They are taken from the list in index order
 */
var minElecReq = 5; //Min & Max electrcity requirement per car
var maxElecReq = 10;
var minWaitPeriod = 3; //NB this is NOT scaled to real time. Be careful if you change # periods!
var maxWaitPeriod = 8;
var numberOfPeriods = 72; //36 hours
var gaussianStrength = 20; //Higher = more gaussian distributed, but less performant.
var successfulFuels = 0; //Fully fuelled
var partialSuccessfulFuels = 0; // >50% fuelled
var unsuccessfulFuels = 0; // 0<x<50% fuelled
var failedFuels = 0; //not fuelled at all
var chartsList = [];
var scaledBaseLoad = [];
var scaledMax = 0;
var maximumCapacity = 0;
var pieChartThreshold = 50;
var resultsLine = [-1,-1,-1];
var resultsPie = [-1,-1,-1];
var tempResultsLine = [];
var tempResultsPie = [];


function buildModel(cars, capacity, chargeRate, iterations){
  var count;
  var carCount;
  carCount = 0;
  var timeCount;
  var carsList = [];
  var carsTimeList = [];
  for (timeCount = 0; timeCount < numberOfPeriods; timeCount++){
    carsTimeList.push(0);
  }
  for(carCount = 0; carCount < cars; carCount++){
    period = createStartTime();
    carsTimeList[period]++;
  }
  for(carCount = 0; carCount < carsTimeList.length; carCount++){
    for (temp = 0; temp < carsTimeList[carCount]; temp++){
      var car = createCar(chargeRate, carCount);
      carsList.push(car);
    }
  }
  console.log(carsTimeList);

  var algorithmType;
  for(algorithmType = 0; algorithmType < 3; algorithmType++){
    tempResultsLine = [];
    tempResultsPie = [];
    for (count = 0; count < iterations; count++){
      var carsListClone = JSON.parse(JSON.stringify(carsList));
      //console.log("CLONED");
      //console.log(carsListClone);
      runModel(carsTimeList, capacity, chargeRate, carsListClone, algorithmType);
    }
    averageResults(algorithmType);
  }

}

function averageResults(algorithmType){
  var count;
  var elecUsageList = tempResultsLine[0][0];
  var overLimitList = tempResultsLine[0][1];
  var iterations = tempResultsLine.length;
  for (count = 1; count < iterations; count++){
    var listCount;
    for (listCount = 0; listCount < 48; listCount++){
      elecUsageList[listCount] += tempResultsLine[count][0][listCount];
      overLimitList[listCount] += tempResultsLine[count][1][listCount];
    }
  }
  elecUsageList = elecUsageList.map(function(x){
    return x / iterations;
  });
  overLimitList = overLimitList.map(function(x){
    return x / iterations;
  });

  var avgSuccess = 0;
  var avgPartial = 0;
  var avgUnsuccess = 0;
  var avgFail = 0;

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

  var sum = (avgSuccess+avgPartial+avgUnsuccess+avgFail)/100;


  var avgLineResult =[elecUsageList, overLimitList];
  var avgPieResult = [Math.round(avgSuccess/sum), Math.round(avgPartial/sum), Math.round(avgUnsuccess/sum), Math.round(avgFail/sum)];

  console.log("Algo"+algorithmType+" Pie="+sum*100);

  resultsLine[algorithmType] = avgLineResult;
  resultsPie[algorithmType] = avgPieResult;
}

function runModel(carsTimeList, capacity, chargeRate, carsList, algorithmType){
  var timeStep;
  var currentCars = [];
  var electricityUsageOverTime = [];
  var car;

  for (timeStep = 0; timeStep < numberOfPeriods; timeStep++){
    var carsToAdd = carsTimeList[timeStep];
    for (carsToAdd; carsToAdd > 0; carsToAdd--){
      currentCars.push(carsList.shift());
    }
    var baseLoadUsage = getScaledBaseLoad(timeStep-12); //-12 to counteract the first 6 hours
    var availableElec = maximumCapacity - baseLoadUsage;
    var electricityUsed = 0;
    var carCounter;
    if (algorithmType == 2){

      //calculates value density for all cars
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){
        car = currentCars[carCounter];
        car.density = valueDensity(car.remainingElectricity, car.timeRemaining, chargeRate, car).toFixed(4);
      }
      //Prioritises based on value density, or time remaining if tie.
      currentCars.sort((car1, car2) => (car1.density < car2.density) ? -1 : (car1.density == car2.density) ? ((car1.timeRemaining > car2.timeRemaining) ? 1 : -1)  : 1);

      carCounter = 0;
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){ //allows splicing mid-loop
        car = currentCars[carCounter];
        //console.log(currentCars[carCounter].density + "t="+currentCars[carCounter].timeRemaining); //////for verification of correct ordering
        var electricityAllocatedThisCar = Math.min(chargeRate, availableElec, car.remainingElectricity);
        electricityUsed += electricityAllocatedThisCar; //Car only uses electricity up to its capacity
        car.remainingElectricity -= electricityAllocatedThisCar;
        availableElec -= electricityAllocatedThisCar;

        if(carLeaving(car)){
          currentCars.splice(carCounter, 1); //removes this car if fuelled or out of time
        }
      }



      electricityUsageOverTime.push(electricityUsed);
    }

    else{
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
  for (carCount = 0; carCount < currentCars.length; carCount++){
    console.log("TEST");
    var car = currentCars[carCount];
    car.timeRemaining = 0;
    carLeaving(car);
  }
  outputResults(electricityUsageOverTime);
}

//can swap this for other algorithms. Current is equal split
function allocateElectricity(numCars, availableElec, chargeRate, algorithmType){
  if (algorithmType == 0){
    return chargeRate; //greedy
  }
  else return Math.min(chargeRate, (availableElec / numCars)); //equal contention
}

function valueDensity(amountNeeded, timeToDeparture, chargeRate, car){
  var denominator = (timeToDeparture+1) * chargeRate;
  return amountNeeded / denominator;
}

//Checks if can be removed & if satisfied
function carLeaving(car){
  car.timeRemaining--;
  if (car.remainingElectricity <= 0){ //car is fully fuelled
    if (car.timeArrived > 12 && car.timeArrived < 60){
      successfulFuels++;
    }
    return true;
  }
  else if (car.timeRemaining <= 0){
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

//DISCUSSION: Output successful chargings over time?
function outputResults(electricityUsageOverTime){
  electricityUsageOverTime.splice(0, 12);
  electricityUsageOverTime.splice(electricityUsageOverTime.length-12, 12);
  //shows where over Capacity
  var count;
  var overLimit = [];
  for (count = 0; count < electricityUsageOverTime.length; count++){
    var amountOver = (electricityUsageOverTime[count] + getScaledBaseLoad(count)) - maximumCapacity; //-ve for all under capacity values
    overLimit.push(Math.max(0, amountOver));
    if(amountOver > 0){
      electricityUsageOverTime[count] -= amountOver; //allows for stacked graph to show correct value
    }
  }
  var graphResults = [electricityUsageOverTime, overLimit];
  tempResultsLine.push(graphResults);

  var pieResults = [successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels];
  tempResultsPie.push(pieResults);

  successfulFuels = 0;
  partialSuccessfulFuels = 0;
  unsuccessfulFuels = 0;
  failedFuels = 0;

  //graph(electricityUsageOverTime, overLimit); NOTE THIS IS NOT CALLED ANYMORE
  //pieChart(successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels);
}

function getScaledBaseLoad(count){
  if (count < 0){
    count += scaledBaseLoad.length;
  }
  if (count >= scaledBaseLoad.length){
    count -= scaledBaseLoad.length;;
  }
  return scaledBaseLoad[count];
}

function createCar(chargeRate, timeStep){
  var car = new Object();
  car.timeRemaining = createTimeRequirement(timeStep-12);
  var maxElectricityPossible = car.timeRemaining * chargeRate; //prevents needing more electricity than is possible
  car.electricityRequirement = Math.min(createElectricityRequirement(), maxElectricityPossible);
  car.remainingElectricity = car.electricityRequirement;
  car.timeArrived = timeStep;
  return car;
}

//DISCUSSION: We said uniform btw 1-20, but can we do better?
function createElectricityRequirement(){
  return 4 + Math.ceil(Math.random()*16); //between 5 and 20 units
}

function createTimeRequirement(count){
  if (count < 0){
    count += scaledBaseLoad.length;
  }
  if (count >= scaledBaseLoad.length){
    count -= scaledBaseLoad.length;;
  }
  if (Math.random() < 0.5){ //Creates a 'short wait' or 'overnight weight' with equal distrib
    return gaussianRandom(2, 6);
  }
  else{
    var distrib = [16,14,12,12,10,10,10,14,48,46,46,44,40,38,36,34,32,30,28,26,24,22,20,18];
    count = Math.floor(count/2);
    maxTime = distrib[count];
    return gaussianRandom(maxTime-8, maxTime); //Avg spread of 4 hours, or 8 periods
  }
}

//Double the index as we only have 24 hour breakdown of charge start times
//+1 half the time to get hour:30
function createStartTime(){
  //NB assume 6pm-6am 36 hours later, so 1/6th come before, 1/6th come after
    var timeDistrib = [0.36,0.22,0.17,0.11,0.1,0.07, //6pm-11pm day before
            0.02,0.01,0.01,0.01,0.01,0.01,0.01, //12-6
            0.03,0.05,0.12,0.09,0.09,0.11, //7-12
            0.12,0.15,0.11,0.17,0.22,0.36, //1-6
            0.22,0.17,0.11,0.1,0.07, //7-11
            0.02,0.01,0.01,0.01,0.01,0.01]; //12am-6am (excl.) day after
  //[4.2,4.0,3.9,6.2,4.6,3.1,2.9,1.0,0.5,0.4,0.3,0.2,2.1,4.0,6.0,4.2,4.3,4.4,4.0,4.6,5.4,5.1,3.8,3.9,4.2,4.0,3.9,6.2,4.6,3.1,2.9,1.0,0.5,0.4,0.3,0.2]; OLD DISTRIB
  var index = 2 * sample(timeDistrib);
  if (Math.random() > 0.5){
    index++;
  }
  return index;
}

//From https://stackoverflow.com/a/39187274
function gaussianRand() {
  var rand = 0;

  for (var i = 0; i < gaussianStrength; i += 1) {
    rand += Math.random();
  }

  return rand / gaussianStrength;
}

//Note: pretty sure this is lower and upper bound inclusive
function gaussianRandom(start, end) {
  return Math.floor(start + gaussianRand() * (end - start + 1));
}

function graph(electricityUsageOverTime, overLimit){
  var periodList = ["00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30","04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"];

  var chart = stackedLineChart(scaledBaseLoad, electricityUsageOverTime, periodList, overLimit);
  //chart.canvas.parentNode.style.height = "900px";
  //chart.canvas.parentNode.style.width = "900px";
  chartsList.push(chart);
}

function pieChart(successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels){
  var ctx = document.getElementById('pieChart').getContext('2d');
  var chart = new Chart(ctx, {
  // The type of chart we want to create
  type: 'doughnut',

  // The data for our dataset
  data: {
      labels: ['Full Charge', 'Mostly Charged', 'Partial Charge', 'Uncharged'],
      datasets: [{
        data: [successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels],
                    backgroundColor: ["#22FF22", "#99FF99","#FF9999", "#FF2222"]
      }]
  },

  // Configuration options go here
  options: {responsive:true}
});
//chart.canvas.parentNode.style.height = '30%';
//chart.canvas.parentNode.style.width = '40%';
chartsList.push(chart);
}

function baseLoad(houses){
  //x1000 for megawatt -> kilowatt conversion
  var scale = 1000 * houses/1885; //1885 is the houses in the dataset
  var meanPerHousehold = 580; //OR 536
  //for the 1885 neighbourhood
  var baseLoadTimes = [0.61,0.55,0.49,0.44,0.42,0.40,0.40,0.39,0.38,0.40,0.42,0.49,0.57,0.72,0.98,1.18,1.16,1.07,1.00,0.96,0.92,0.88,0.85,0.84,0.93,0.93,0.84,0.75,0.74,0.80,0.84,0.98,1.16,1.44,1.66,1.74,1.74,1.71,1.65,1.57,1.50,1.47,1.46,1.37,1.28,1.14,0.94,0.77];
  var scaled = baseLoadTimes.map(function(x){
    var noiseFactor = 0.90 + (gaussianRand(0, 20) / 10);
    x = x * noiseFactor;
    return x * scale; });
  return scaled;
}

//From https://gist.github.com/brannondorsey/dc4cfe00d6b124aebd3277159dcbdb14
// draw a discrete sample (index) from a probability distribution (an array of probabilities)
// probs will be rescaled to sum to 1.0 if the values do not already
function sample(probs) {
    const sum = probs.reduce((a, b) => a + b, 0)
    if (sum <= 0) throw Error('probs must sum to a value greater than zero')
    const normalized = probs.map(prob => prob / sum)
    const sample = Math.random()
    let total = 0
    for (let i = 0; i < normalized.length; i++) {
        total += normalized[i]
        if (sample < total) return i
    }
}
