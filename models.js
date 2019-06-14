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

  var count; //Removes old charts
  for (count = chartsList.length -1; count > -1; count--){
    chartsList[count].destroy();
  }
  chartsList = [];
  buildModel(carCount, capacity, chargeRate, iterations);
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
    var electricityPerCar = allocateElectricity(currentCars.length, capacity, chargeRate);


    electricityUsageOverTime.push(electricityPerCar * currentCars.length);
    var car;
    var carCounter;
    for (carCounter = currentCars.length-1; carCounter >= 0; carCounter--){ //allows splicing mid-loop
      car = currentCars[carCounter];
      car.remainingElectricity -= electricityPerCar;
      car.timeRemaining--;
      if(carLeaving(car)){
        currentCars.splice(carCounter, 1); //removes this car if fuelled or out of time
      }
    }
  }
  outputResults(electricityUsageOverTime);
}

//can swap this for other algorithms. Current is equal split
function allocateElectricity(numCars, capacity, chargeRate){
  return Math.min(chargeRate, (capacity / numCars));
}

//Checks if can be removed & if satisfied
function carLeaving(car){
  if (car.remainingElectricity <= 0){ //car is fully fuelled
    successfulFuels++;
    return true;
  }
  else if (car.timeRemaining <= 0){
    console.log("Car"+car.remainingElectricity);
    var percentageLeft = car.remainingElectricity / car.electricityRequirement;
    if (percentageLeft < 0.5){
      partialSuccessfulFuels++; //car is mostly fuelled
    }
    else if (percentageLeft == 0){
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
  graph(electricityUsageOverTime);
  pieChart(successfulFuels, partialSuccessfulFuels, unsuccessfulFuels, failedFuels);
}



//NB: TODO: these two parameters may be shortened based on how much time is remaining by the time they enter the simulation
//DISCUSS: Cars that would normally be easily satisfied (low req, long wait time) can be made hard if they come late. Solution?
function createCar(chargeRate){
  var car = new Object();
  car.timeRemaining = createTimeRequirement();
  var maxElectricityPossible = car.timeRemaining * chargeRate; //prevents needing more electricity than is possible
  car.electricityRequirement = Math.min(createElectricityRequirement(), maxElectricityPossible);
  car.remainingElectricity = car.electricityRequirement;
  return car;
}

function createElectricityRequirement(){
  return gaussianRandom(minElecReq, maxElecReq);
}

function createTimeRequirement(){
  return gaussianRandom(minWaitPeriod, maxWaitPeriod);
}

function createStartTime(){
  return gaussianRandom(0, numberOfPeriods-1);
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
function graph(electricityUsageOverTime){
  var temp = 47;
  var periodList = [];
  for (temp; temp > -1; temp--){
    periodList.push(temp);
  }
  var ctx = document.getElementById('myChart').getContext('2d');
var chart = new Chart(ctx, {
  // The type of chart we want to create
  type: 'bar',

  // The data for our dataset
  data: {
      labels: periodList,
      datasets: [{
          label: 'Energy Usage as Percentage of Capacity',
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: electricityUsageOverTime
      }]
  },

  // Configuration options go here
  options: {}
});
//chart.canvas.parentNode.style.height = '30%';
//chart.canvas.parentNode.style.width = '60%';
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
