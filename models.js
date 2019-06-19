var imported = document.createElement("script");
imported.src = "complexGraph.js";
document.getElementsByTagName("head")[0].appendChild(imported);

function submit(){
  //TODO: validation?
  var houses = document.getElementById("houses").value;
  var penetration = document.getElementById('penetration').value;
  penetration = penetration / 100;
  var capacity = document.getElementById('capacity').value;
  var chargeRate = document.getElementById('chargerate').value;
  chargeRate = chargeRate * 24 / numberOfPeriods; //scales hours to periods
  var iterations = document.getElementById('iterations').value;
  var carCount = Math.round(houses * penetration);

  successfulFuels = 0; //resets outcome
  partialSuccessfulFuels = 0;
  unsuccessfulFuels = 0;
  failedFuels = 0;
  scaledBaseLoad = baseLoad(houses);
  scaledMax = Math.max.apply(null,scaledBaseLoad);
  maximumCapacity = (capacity / 100) * scaledMax;

  var count; //Removes old charts
  for (count = chartsList.length -1; count > -1; count--){
    chartsList[count].destroy();
  }
  chartsList = [];
  buildModel(carCount, capacity, chargeRate, iterations);
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
var numberOfPeriods = 48;
var gaussianStrength = 20; //Higher = more gaussian distributed, but less performant.
var successfulFuels = 0; //Fully fuelled TODO: These may have to be local
var partialSuccessfulFuels = 0; // >50% fuelled
var unsuccessfulFuels = 0; // 0<x<50% fuelled
var failedFuels = 0; //not fuelled at all
var chartsList = [];
var scaledBaseLoad = [];
var scaledMax = 0;
var maximumCapacity = 0;

function buildModel(cars, capacity, chargeRate, iterations){
  var count;
  for (count = 0; count < iterations; count++){
    console.log("Iteration:"+count+1);
    var carCount;
    var carsList = [];
    for(carCount = 0; carCount < cars; carCount++){
      carsList.push(createCar(chargeRate));
    }
    carCount = 0;
    var timeCount;
    var carsTimeList = []
    for (timeCount = 0; timeCount < numberOfPeriods; timeCount++){
      carsTimeList.push(0);
    }
    for(carCount = 0; carCount < cars; carCount++){
      period = createStartTime();
      carsTimeList[period]++;
    }
    console.log(carsList);
    console.log(carsTimeList);
    runModel(carsList, carsTimeList, capacity, chargeRate);
  }
}

function runModel(carsList, carsTimeList, capacity, chargeRate){
  var timeStep;
  var currentCars = [];
  var electricityUsageOverTime = [];
  for (timeStep = 0; timeStep < numberOfPeriods; timeStep++){
    var carsToAdd = carsTimeList[timeStep];
    for (carsToAdd; carsToAdd > 0; carsToAdd--){
      currentCars.push(carsList.shift());
    }
    var availableElec = maximumCapacity - scaledBaseLoad[timeStep];
    var electricityUsed = 0;
    var car;
    if (false){ //replace with algorithmtype = valuedensity

      //calculates value density for all cars
      for (carCounter = 0 ; carCounter < currentCars.length; carCounter++){
        car = currentCars[carCounter];
        car.density = valueDensity(car.remainingElectricity, car.timeRemaining, chargeRate, car);
      }
      //currentCars.sort((car1, car2) => (car1.density < car2.density) ? 1 : -1);
      //Prioritises based on value density, or time remaining if tie.
      currentCars.sort((car1, car2) => (car1.density < car2.density) ? -1 : (car1.density == car2.density) ? ((car1.timeRemaining > car2.timeRemaining) ? -1 : 1)  : 1);

      console.log("NEWSET");
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){ //allows splicing mid-loop
        console.log(currentCars[carCounter].density + "t="+currentCars[carCounter].timeRemaining);

        //electricityUsed += Math.min(electricityPerCar, car.remainingElectricity); //Car only uses electricity up to its capacity
        //car.remainingElectricity -= electricityPerCar;

        car.timeRemaining--;
        if(carLeaving(car)){
          currentCars.splice(carCounter, 1); //removes this car if fuelled or out of time
        }
      }



      electricityUsageOverTime.push(electricityUsed);
    }
    else{
      var electricityPerCar = allocateElectricity(currentCars.length, availableElec, chargeRate);
      var carCounter;
      for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){ //allows splicing mid-loop
        car = currentCars[carCounter];
        electricityUsed += Math.min(electricityPerCar, car.remainingElectricity); //Car only uses electricity up to its capacity
        car.remainingElectricity -= electricityPerCar;
        car.timeRemaining--;
        if(carLeaving(car)){
          currentCars.splice(carCounter, 1); //removes this car if fuelled or out of time
        }
      }
      electricityUsageOverTime.push(electricityUsed);
    }
  }
  outputResults(electricityUsageOverTime);
}

//can swap this for other algorithms. Current is equal split
function allocateElectricity(numCars, availableElec, chargeRate){
  //return chargeRate;
  return Math.min(chargeRate, (availableElec / numCars));
}

function valueDensity(amountNeeded, timeToDeparture, chargeRate, car){
  if (timeToDeparture < 0){
    console.log("wow!");
  }
  var denominator = (timeToDeparture+1) * chargeRate;
  return amountNeeded / denominator;
}

//Checks if can be removed & if satisfied
function carLeaving(car){
  if (car.remainingElectricity <= 0){ //car is fully fuelled
    successfulFuels++;
    return true;
  }
  else if (car.timeRemaining <= 0){
    var percentageLeft = car.remainingElectricity / car.electricityRequirement;
    if (percentageLeft < 0.5){
      partialSuccessfulFuels++; //car is mostly fuelled
    }
    else if (percentageLeft == 1){
      failedFuels++; //car received no fuelling at all
    }
    else{
      unsuccessfulFuels++; //car received less than half of fuel
    }
    return true;
  }
  return false; //car is not yet ready to leave
}

//DISCUSSION: Output successful chargings over time?
function outputResults(electricityUsageOverTime){
  console.log("Electricity Usage: "+electricityUsageOverTime);
  //shows where over Capacity
  var count;
  var overLimit = [];
  for (count = 0; count < electricityUsageOverTime.length; count++){
    var amountOver = (electricityUsageOverTime[count] + scaledBaseLoad[count]) - maximumCapacity; //-ve for all under capacity values
    overLimit.push(Math.max(0, amountOver));
    if(amountOver > 0){
      electricityUsageOverTime[count] -= amountOver; //allows for stacked graph to show correct value
    }
  }
  graph(electricityUsageOverTime, overLimit);
  pieChart(successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels);
}



//NB: TODO: these two parameters may be shortened based on how much time is remaining by the time they enter the simulation
//DISCUSS: Cars that would normally be easily satisfied (low req, long wait time) can be made hard if they come late. Solution?
function createCar(chargeRate){
  var car = new Object();
  car.timeRemaining = createTimeRequirement();
  if (car.timeRemaining <= 0){
    console.log("wowee");
  }
  var maxElectricityPossible = car.timeRemaining * chargeRate; //prevents needing more electricity than is possible
  car.electricityRequirement = Math.min(createElectricityRequirement(), maxElectricityPossible);
  car.remainingElectricity = car.electricityRequirement;
  return car;
}

//DISCUSSION: We said uniform btw 1-20, but can we do better?
function createElectricityRequirement(){
  return 9 + Math.ceil(Math.random()*11); //between 11 and 20 units
}

//TODO: Can improve this with proper distrib
function createTimeRequirement(){
  return gaussianRandom(minWaitPeriod, maxWaitPeriod);
}

//Double the index as we only have 24 hour breakdown of charge start times
//+1 half the time to get hour:30
function createStartTime(){
  var probDistrib = [2.9,1.0,0.5,0.4,0.3,0.2,2.1,4.0,6.0,4.2,4.3,4.4,4.0,4.6,5.4,5.1,3.8,3.9,4.2,4.0,3.9,6.2,4.6,3.1];
  var index = 2 * sample(probDistrib);
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

//TODO: UPDATE
function graph(electricityUsageOverTime, overLimit){
  var periodList = ["00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30","04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"];

  var chart = stackedLineChart(scaledBaseLoad, electricityUsageOverTime, periodList, overLimit);
chart.canvas.parentNode.style.height = "900px";
chart.canvas.parentNode.style.width = "900px";
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
