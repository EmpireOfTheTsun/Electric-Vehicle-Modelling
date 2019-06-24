//This file contains the complex stacked line graph code to declutter the main file a little.

function stackedLineChart(baseLine, additionalElec, periodList, overLimit){
  var ctx = document.getElementById('myChart').getContext('2d');

  const colors = { // hex codes for various colours if you want to change without much hassle
    green: {
      fill: '#e0eadf',
      stroke: '#5eb84d',
    },
    lightBlue: {
      stroke: '#6fccdd',
    },
    darkBlue: {
      fill: '#92bed2',
      stroke: '#3282bf',
    },
    purple: {
      fill: '#8fa8c8',
      stroke: '#75539e',
    },
    red: {
      fill: '#ff2222',
      stroke: '#ff5555',
    },
  };

  var myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: periodList, //x-axis labels for the times
      datasets: [{
        label: "Baseline", //Data and colours for baseline energy consumption line
        fill: true,
        backgroundColor: colors.purple.fill,
        pointBackgroundColor: colors.purple.stroke,
        borderColor: colors.purple.stroke,
        pointHighlightStroke: colors.purple.stroke,
        borderCapStyle: 'butt',
        data: baseLine,

      }, {
        label: "Additional EV Impact", //Data/colours for the EV impact on the transformer, excluding impact above capacity
        fill: true,
        backgroundColor: colors.darkBlue.fill,
        pointBackgroundColor: colors.darkBlue.stroke,
        borderColor: colors.darkBlue.stroke,
        pointHighlightStroke: colors.darkBlue.stroke,
        borderCapStyle: 'butt',
        data: additionalElec,
      }, {
        label: "Over Capacity", //Data/colours for EV impact above capacity
        fill: true,
        backgroundColor: colors.red.fill,
        pointBackgroundColor: colors.red.stroke,
        borderColor: colors.red.stroke,
        pointHighlightStroke: colors.red.stroke,
        borderCapStyle: 'butt',
        data: overLimit,
      }]
    },
    options: {
      responsive: false, //Prevents resiving to keep graph display and format consistent
      scales: {
        yAxes: [{
          scaleLabel:{
            display:true,
            labelString: "Energy Consumption (kW)" //y-axis label
          },
          stacked: true, //Causes the values to be added on top of each other
        }],
        xAxes: [{
          scaleLabel:{
            display:true,
            labelString: "Time" //x-axis label
          }
        }]
      },
      animation: {
        duration: 750,
      },
    }
  });
  return myChart;
}
