
function stackedLineChart(baseLine, additionalElec, periodList, overLimit){
  var ctx = document.getElementById('myChart').getContext('2d');



  const colors = {
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
      labels: periodList,
      datasets: [{
        label: "Baseline",
        fill: true,
        backgroundColor: colors.purple.fill,
        pointBackgroundColor: colors.purple.stroke,
        borderColor: colors.purple.stroke,
        pointHighlightStroke: colors.purple.stroke,
        borderCapStyle: 'butt',
        data: baseLine,

      }, {
        label: "Additional EV Impact",
        fill: true,
        backgroundColor: colors.darkBlue.fill,
        pointBackgroundColor: colors.darkBlue.stroke,
        borderColor: colors.darkBlue.stroke,
        pointHighlightStroke: colors.darkBlue.stroke,
        borderCapStyle: 'butt',
        data: additionalElec,
      }, {
        label: "Over Capacity",
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
      responsive: false,
      // Can't just just `stacked: true` like the docs say
      scales: {
        yAxes: [{
          stacked: true,
        }]
      },
      animation: {
        duration: 750,
      },
    }
  });
  return myChart;
}

function old(){
  new Chart(ctx, {
    // The type of chart we want to create
    type: 'bar',

    // The data for our dataset
    data: {
        labels: periodList,
        datasets: [{
            label: 'Energy Usage Over Time',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: electricityUsageOverTime
        }]
    },

    // Configuration options go here
    options: {}
  });
}
