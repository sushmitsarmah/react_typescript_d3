import React, { Component, createRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson';

import './MapTransition.css';

import {
    City,
    CityProcessed,
    MapTransitionState,
    MapTransitionProps
} from './interfaces';

// global constants
const CITIES = ['Los Angeles', 'New York', 'Dallas', 'Chicago'];
const CITIES_FILE_URL = 'data/us_cities.csv';
const USMAP_FILE_URL = 'data/us.json';
const TRANSITION_DELAY = 500;
const TRANSITION_DURATION = 3000;

class MapTransition extends Component<MapTransitionProps, MapTransitionState> {

    private chart: React.RefObject<SVGSVGElement> = createRef<SVGSVGElement>();
    private svg!: d3.Selection<SVGGElement, {}, null, undefined>;
    private projection!: d3.GeoProjection;
    private path!: d3.GeoPath<any, d3.GeoPermissibleObjects>;
    private zoom!: d3.ZoomBehavior<Element, {}>;

    private index = 0;
    private city!: CityProcessed;
    private cities!: CityProcessed[];

    constructor(props: MapTransitionProps) {
        super(props);
        this.state = {
            cities: [],
            usmap: {}
        };
        this.initChart = this.initChart.bind(this);
        this.zoomed = this.zoomed.bind(this);
        this.transform = this.transform.bind(this);
        this.transition = this.transition.bind(this);
        this.loadData = this.loadData.bind(this);
    }

    async componentDidMount() {
        this.initChart();
        await this.loadData();
        this.drawChart();
    }

    private async loadData() {
        const citiesRequest = d3.csv(CITIES_FILE_URL);
        const mapRequest = d3.json(USMAP_FILE_URL);

        try {
            const result = await Promise.all([citiesRequest, mapRequest]);
            const cities = result[0].map((d: any) => {
                return (d as City);
            });
            this.setState({
                cities: cities,
                usmap: result[1]
            });
        } catch (err) {
            throw (err);
        }
    }

    private zoomed (): void {
        const translate = `translate(${d3.event.transform.x}, ${d3.event.transform.y})`;
        const scale = `scale(${d3.event.transform.k}, ${d3.event.transform.k})`;
        const transform = `${translate} ${scale}`;
        this.svg.attr('transform', transform);
    };
    
    private transform (): d3.ZoomTransform {
        // create a geojson point
        const cityPoint: d3.GeoPermissibleObjects = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": this.city.lnglat
            },
            "properties": {
                "name": "Dinagat Islands"
            }
        };

        // get the center in pixels
        const centroid: number[] = this.path.centroid(cityPoint);
        const x = this.props.width / 2 - centroid[0];
        const y = this.props.height / 2 - centroid[1];

        // return the transform translate
        return d3.zoomIdentity.translate(x, y);
    }

    // transition between cities
    private transition () {
        this.index++;

        this.index = this.index % (CITIES.length);

        // get the current city
        this.city = this.cities[this.index];

        // transition to current city
        this.svg.transition()
            .delay(TRANSITION_DELAY)
            .duration(TRANSITION_DURATION)
            .call( (this.zoom.transform as any), this.transform)
            .on('end', () => { this.svg.call(this.transition); });
    }

    // initialize the svg
    private initChart(): void {
        this.svg = d3.select(this.chart.current).append('g');
        this.projection = d3.geoMercator();
        this.path = d3.geoPath().projection(this.projection);
        this.zoom = d3.zoom().on('zoom', this.zoomed);
    }

    // draw the chart
    private drawChart (): void {
        if (this.state.cities !== undefined && this.state.usmap !== undefined) {
            const cities = this.state.cities
                .filter((d: City) => {
                    return CITIES.indexOf(d.PlaceName) !== -1;
                })
                .map(d => {
                    const lnglat = d.Geolocation.replace(/[\(\)\s]/g, '').split(',').map(d => +d).reverse();
                    return {
                        stateAbbr: d.StateAbbr,
                        placeName: d.PlaceName,
                        lng: lnglat[0],
                        lat: lnglat[1],
                        lnglat: lnglat
                    };
                });

            this.cities = (cities as CityProcessed[]);
            this.city = this.cities[this.index];

            // get the center of map
            const center = this.cities[3].lnglat;

            // this.svg.call( (this.zoom.transform as any), this.transform);
            this.svg.call(this.transition);

            // set the scale and center for projection
            this.projection.scale(7000).center(center);

            const us = (this.state.usmap as any);
            const feat: any = topojson.feature(us, us.objects.states);
            const features = feat['features'];
            const mesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
            const meshpath = this.path(mesh);

            // draw all the states
            this.svg.append('g')
                .attr('class', 'states')
                .selectAll('path')
                .data(features)
                .enter().append('path')
                .attr('d', (this.path as any));

            // draw the state borders
            if (meshpath !== null) {
                this.svg.append('path')
                    .attr('class', 'state-borders')
                    .attr('d', meshpath);
            }

            // set the city points
            const point = this.svg.selectAll('.city')
                .data(this.cities).enter()
                .append('g')
                .classed('city', true)
                .attr('transform', (d: CityProcessed) => {
                    const lnglat = this.projection(d.lnglat);
                    if(lnglat !== null) {
                        const lng: any = lnglat[0];
                        const lat: any = lnglat[1];
                        return `translate(${lng},${lat})`;
                    } else {
                        return '';
                    }
                });

            // add circles to svg
            point.append('circle')
                .classed('city-circle', true)
                .attr('r', '8px');

            // add circles to svg
            point.append('text')
                .classed('city-text', true)
                .text((d: CityProcessed) => d.placeName);
        }
    };

    render() {
        return (
            <svg ref={this.chart} width={this.props.width} height={this.props.height} />
        );
    }
}

export default MapTransition;
