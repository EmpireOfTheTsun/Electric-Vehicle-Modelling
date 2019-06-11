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
  buildModel(carCount, capacity, chargeRate, iterations);
}

/* THE MODEL
This consists of a list of numbers determined by 'numberofPeriods' (48 is one per half hour period)
The number at each period is the number of cars that will arrive at that point
Cars are randomly generated with required electricity and time remaining, and are also stored in a List
They are taken from the list in index order
 */
var minElecReq = 5; //Min & Max electrcity requirement per car
var maxElecReq = 15;
var minWaitPeriod = 3; //NB this is NOT scaled to real time. Be careful if you change # periods!
var maxWaitPeriod = 8;
var numberOfPeriods = 48;
var gaussianStrength = 20; //Higher = more gaussian distributed, but less performant.

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
  }
  alert("Bees");
}








//NB: TODO: these two parameters may be shortened based on how much time is remaining by the time they enter the simulation
//DISCUSS: Should we treat cars that get shortened parameters differently?
//DISCUSS: Cars that would normally be easily satisfied (low req, long wait time) can be made hard if they come late. Solution?
function createCar(chargeRate){
  var car = new Object();
  car.timeRemaining = createTimeRequirement();
  var maxElectricityPossible = car.timeRemaining * chargeRate; //prevents needing more electricity than is possible
  car.remainingElectricity = Math.max(createElectricityRequirement(), maxElectricityPossible);
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
