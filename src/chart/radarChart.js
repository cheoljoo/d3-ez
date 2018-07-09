import * as d3 from "d3";
import { default as palette } from "../palette";
import { default as dataParse } from "../dataParse";
import { default as component } from "../component";

export default function() {

	/**
	 * Default Properties
	 */
	let svg;
	let chart;
	let classed = "polarArea";
	let width = 400;
	let height = 300;
	let margin = { top: 20, right: 20, bottom: 20, left: 20 };
	let transition = { ease: d3.easeBounce, duration: 500 };
	let colors = palette.categorical(3);
	let dispatch = d3.dispatch("customValueMouseOver", "customValueMouseOut", "customValueClick", "customSeriesMouseOver", "customSeriesMouseOut", "customSeriesClick");

	/**
	 * Chart Dimensions
	 */
	let chartW;
	let chartH;
	let radius;

	/**
	 * Scales
	 */
	let xScale;
	let yScale;
	let rScale;
	let colorScale;

	/**
	 * Other Customisation Options
	 */
	let startAngle = 0;
	let endAngle = 360;
	let capitalizeLabels = false;
	let colorLabels = false;

	/**
	 * Initialise Data, Scales and Series
	 */
	function init(data) {
		chartW = width - (margin.left + margin.right);
		chartH = height - (margin.top + margin.bottom);

		// If the radius has not been passed then calculate it from width/height.
		radius = typeof radius === "undefined" ? Math.min(chartW, chartH) / 2 : radius;

		// Slice Data, calculate totals, max etc.
		let slicedData = dataParse(data);
		let categoryNames = slicedData.categoryNames;
		let maxValue = slicedData.maxValue;

		// If the colorScale has not been passed then attempt to calculate.
		colorScale = typeof colorScale === "undefined" ? d3.scaleOrdinal().domain(categoryNames).range(colors) : colorScale;

		// X & Y Scales
		xScale = d3.scaleBand().domain(categoryNames).rangeRound([startAngle, endAngle]).padding(0.15);

		yScale = d3.scaleLinear().domain([0, maxValue]).range([0, radius]).nice();

		rScale = yScale;
	}

	/**
	 * Constructor
	 */
	function my(selection) {
		// Create SVG element (if it does not exist already)
		if (!svg) {
			svg = function(selection) {
				let el = selection._groups[0][0];
				if (!!el.ownerSVGElement || el.tagName === "svg") {
					return selection;
				} else {
					return selection.append("svg");
				}
			}(selection);

			svg.classed("d3ez", true).attr("width", width).attr("height", height);

			chart = svg.append("g").classed("chart", true);
		} else {
			chart = selection.select(".chart");
		}

		// Update the chart dimensions and add layer groups
		let layers = ["circularAxis", "circularSectorLabels", "verticalAxis axis"];
		chart.classed(classed, true).attr("transform", "translate(" + width / 2 + "," + height / 2 + ")").attr("width", chartW).attr("height", chartH).selectAll("g").data(layers).enter().append("g").attr("class", function(d) {
			return d;
		});

		selection.each(function(data) {
			// Initialise Data
			init(data);

			// Slice calculation on circle
			let angleSlice = (Math.PI * 2 / data.length + 1);

			// Create Circular Axis
			let circularAxis = component.circularAxis().radialScale(xScale).ringScale(yScale).radius(radius);

			// Rendering
			chart.select(".circularAxis").call(circularAxis);

			// Creating radar wrapper for Circle and lines
			let radarWrapper = chart.selectAll(".radarWrapper").data(data.map(function(e) {
				return e.values;
			})).enter().append("g").attr("class", "radarWrapper");


			// Function to genreate radar line points
			let radarLine = d3.radialLine().radius(function(d) {return yScale(d.value); }).angle(function(d, i) {return i * angleSlice; })
				.curve(d3.curveBasis)
				.curve(d3.curveCardinalClosed);

			radarWrapper.append("path").attr("class", "radarArea").attr("d", function(d, i) { return radarLine(d); })
				.style("fill", function(d, i) { return colorScale(i); })
				.style("fill-opacity", 0.1)
				.on('mouseover', function(d, i) {
					//Dim all Radar Wrapper
					d3.selectAll(".radarArea")
						.transition().duration(200)
						.style("fill-opacity", 0.1);

					//Bring back Radar Wrapper
					d3.select(this)
						.transition().duration(200)
						.style("fill-opacity", 0.7);
				})
				.on('mouseout', function() {
					//Bring back all Radar Wrappers
					d3.selectAll(".radarArea")
						.transition().duration(200)
						.style("fill-opacity", 0.1);
				});

			// Creating lines/Path on circle
			radarWrapper.append("path").attr("class", "radarStroke").attr("d", function(d, i) { return radarLine(d); }).style("stroke-width", 3 + "px")
				.style("stroke", function(d, i) { return colorScale(i); })
				.style("fill", "none")

			// Create Radar Circle points on line
			radarWrapper.selectAll(".radarCircle")
				.data(function(d, i) { return d; })
				.enter().append("circle")
				.attr("class", "radarCircle")
				.attr("r", 4)
				.attr("cx", function(d, i) { return yScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
				.attr("cy", function(d, i) { return yScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
				.style("fill", function(d, i, j) { return colorScale(j); })
				.style("fill-opacity", 0.8);

			// Creating vertical scale
			let axisScale = d3.scaleLinear().domain(yScale.domain()).range(yScale.range().reverse()).nice();

			// Render vertical scale on circle
			let verticalAxis = d3.axisLeft(axisScale);
			chart.select(".verticalAxis").attr("transform", "translate(0," + -radius + ")").call(verticalAxis);

			// Adding Circular Lables on Page
			let circularSectorLabels = component.circularSectorLabels().radius(radius * 1.04).radialScale(xScale).textAnchor("start");
			chart.select(".circularSectorLabels").call(circularSectorLabels);

			//Wrapper for the invisible circles on top
			let radarCircleWrapper = chart.selectAll(".radarCircleWrapper")
				.data(data.map(function(e) {
					return e.values;
				}))
				.enter().append("g")
				.attr("class", "radarCircleWrapper");

			//Append a set of invisible circles on top for the mouseover pop-up
			radarCircleWrapper.selectAll(".radarInvisibleCircle")
				.data(function(d, i) { return d; })
				.enter().append("circle")
				.attr("class", "radarInvisibleCircle")
				.attr("r", 4 * 1.5)
				.attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
				.attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
				.style("fill", "none")
				.style("pointer-events", "all")
				.on("mouseover", function(d, i) {
					let newX = parseFloat(d3.select(this).attr('cx')) - 10;
					let newY = parseFloat(d3.select(this).attr('cy')) - 10;

					tooltip
						.attr('x', newX)
						.attr('y', newY)
						.text(d.value)
						.transition().duration(200)
						.style('opacity', 1);
				})
				.on("mouseout", function() {
					tooltip.transition().duration(200)
						.style("opacity", 0);
				});

			// Set up the small tooltip for when you hover over a circle
			let tooltip = chart.append("text")
				.attr("class", "tooltip")
				.style("opacity", 0);
		});
	}

	/**
	 * Configuration Getters & Setters
	 */
	my.width = function(_) {
		if (!arguments.length) return width;
		width = _;
		return this;
	};

	my.height = function(_) {
		if (!arguments.length) return height;
		height = _;
		return this;
	};

	my.colors = function(_) {
		if (!arguments.length) return colors;
		colors = _;
		return this;
	};

	my.colorScale = function(_) {
		if (!arguments.length) return colorScale;
		colorScale = _;
		return this;
	};

	my.transition = function(_) {
		if (!arguments.length) return transition;
		transition = _;
		return this;
	};

	my.dispatch = function(_) {
		if (!arguments.length) return dispatch();
		dispatch = _;
		return this;
	};

	my.on = function() {
		let value = dispatch.on.apply(dispatch, arguments);
		return value === dispatch ? my : value;
	};

	return my;
}
