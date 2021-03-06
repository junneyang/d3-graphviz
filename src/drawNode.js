import Viz from "viz.js/viz";
import * as d3 from "d3-selection";
import {rotate} from "./geometry";
import {extractAllElementsData} from "./element";
import {translatePointsAttribute} from "./svg";
import {translateDAttribute} from "./svg";
import {insertAllElementsData} from "./element";
import {roundTo4Decimals} from "./utils";

var defaultNodeAttributes = {
    id: null,
    fillcolor: "none",
    color: "#000000",
    penwidth: null,
    URL: null,
    tooltip: null,
    labeljust: null,
    fontname: null,
    fontsize: null,
    fontcolor: null,
};

var multiFillShapes = [
    'fivepoverhang',
    'threepoverhang',
    'noverhang',
    'assembly',
];

var plainShapes = [
    'none',
    'plain',
    'plaintext',
];

function completeAttributes(attributes, defaultAttributes=defaultNodeAttributes) {
    if (attributes.style == 'filled' && !attributes.fillcolor) {
        if (attributes.color) {
            attributes.fillcolor = attributes.color;
        } else {
            attributes.fillcolor = '#d3d3d3';
        }
    }
    if (attributes.style == 'filled') {
        if (plainShapes.includes(attributes.shape)) {
            attributes.color = 'transparent';
        } else if (!attributes.color) {
            attributes.color = '#000000';
        }
    }
    if (attributes.shape == 'point' && !attributes.fillcolor) {
        attributes.fillcolor = '#000000';
    }
    for (var attribute in defaultAttributes) {
        if (attributes[attribute] === undefined) {
            attributes[attribute] = defaultAttributes[attribute];
        }
    }
}

export function drawNode(x, y, nodeId, attributes={}, options={}) {
    completeAttributes(attributes);
    var root = this._selection;
    var svg = root.selectWithoutDataPropagation("svg");
    var graph0 = svg.selectWithoutDataPropagation("g");
    var newNode = graph0.append(function() {
        return createNode(nodeId, attributes).node();
    });
    newNode.datum(null);

    this._drawnNode = {
        g: newNode,
        nodeId: nodeId,
        x: x,
        y: y,
        attributes: attributes,
    };
    _updateNode(newNode, x, y, nodeId, attributes, options);

    return this;
}

export function updateDrawnNode(x, y, nodeId, attributes={}, options={}) {
    if (!this._drawnNode)  {
        throw Error('No node has been drawn');
    }

    var node = this._drawnNode.g
    if (nodeId == null) {
        nodeId = this._drawnNode.nodeId;
    }
    completeAttributes(attributes, this._drawnNode.attributes);
    this._drawnNode.nodeId = nodeId;
    this._drawnNode.x = x;
    this._drawnNode.y = y;
    this._drawnNode.attributes = attributes;
    _updateNode(node, x, y, nodeId, attributes, options);

    return this;
}

function _updateNode(node, x, y, nodeId, attributes, options) {

    var id = attributes.id;
    var fill = attributes.fillcolor;
    var stroke = attributes.color;
    var strokeWidth = attributes.penwidth;
    if (attributes.labeljust == 'l') {
        var textAnchor = 'start';
    } else if (attributes.labeljust == 'r') {
        var textAnchor = 'end';
    } else if (attributes.labeljust == 'c') {
        var textAnchor = 'middle';
    } else {
        var textAnchor = null;
    }
    var fontFamily = attributes.fontname;
    var fontSize = attributes.fontsize;
    var fontColor = attributes.fontcolor;
    if ('label' in attributes) {
        var label = attributes['label'];
    } else {
        var label = nodeId;
    }

    var title = node.selectWithoutDataPropagation('title');
    if (attributes.URL || attributes.tooltip) {
        var subParent = node.selectWithoutDataPropagation("g").selectWithoutDataPropagation("a");
    } else {
        var subParent = node;
    }
    var svgElements = subParent.selectAll('ellipse,polygon,path,polyline');
    var text = node.selectWithoutDataPropagation("text");

    node
        .attr("id", id);

    title.text(nodeId);
    if (svgElements.size() != 0) {
        var bbox = svgElements.node().getBBox();
        bbox.cx = bbox.x + bbox.width / 2;
        bbox.cy = bbox.y + bbox.height / 2;
    } else if (text.size() != 0) {
        bbox = {
            x: +text.attr('x'),
            y: +text.attr('y'),
            width: 0,
            height: 0,
            cx: +text.attr('x'),
            cy: +text.attr('y'),
        }
    }
    svgElements.each(function(data, index) {
        var svgElement = d3.select(this);
        if (svgElement.attr("cx")) {
            svgElement
                .attr("cx", roundTo4Decimals(x))
                .attr("cy", roundTo4Decimals(y));
        } else if (svgElement.attr("points")) {
            var pointsString = svgElement.attr('points');
            svgElement
                .attr("points", translatePointsAttribute(pointsString, x - bbox.cx, y - bbox.cy));
        } else {
            var d = svgElement.attr('d');
            svgElement
                .attr("d", translateDAttribute(d, x - bbox.cx, y - bbox.cy));
        }
        if (index == 0 || multiFillShapes.includes(attributes.shape)) {
            svgElement
                .attr("fill", fill)
                .attr("stroke", stroke);
            if (strokeWidth) {
                svgElement
                    .attr("strokeWidth", strokeWidth);
            }
        }
    });

    if (text.size() != 0) {

        if (textAnchor) {
            text
                .attr("text-anchor", textAnchor)
        }
        text
            .attr("x", roundTo4Decimals(+text.attr("x") + x - bbox.cx))
            .attr("y", roundTo4Decimals(+text.attr("y") + y - bbox.cy));
        if (fontFamily) {
            text
                .attr("font-family", fontFamily);
        }
        if (fontSize) {
            text.attr("font-size", fontSize);
        }
        if (fontColor) {
            text
                .attr("fill", fontColor);
        }
        text
            .text(label);
    }
    return this;
}

export function removeDrawnNode() {

    if (!this._drawnNode)  {
        return this;
    }

    var node = this._drawnNode.g;

    node.remove();

    this._drawnNode = null;

    return this
}

export function insertDrawnNode(nodeId) {

    if (!this._drawnNode)  {
        throw Error('No node has been drawn');
    }

    if (nodeId == null) {
        nodeId = this._drawnNode.nodeId;
    }
    var node = this._drawnNode.g;
    var attributes = this._drawnNode.attributes;

    var title = node.selectWithoutDataPropagation("title");
    title
        .text(nodeId);
    if (attributes.URL || attributes.tooltip) {
        var ga = node.selectWithoutDataPropagation("g");
        var a = ga.selectWithoutDataPropagation("a");
        var svgElement = a.selectWithoutDataPropagation('ellipse,polygon,path,polyline');
        var text = a.selectWithoutDataPropagation('text');
    } else {
        var svgElement = node.selectWithoutDataPropagation('ellipse,polygon,path,polyline');
        var text = node.selectWithoutDataPropagation('text');
    }
    text
        .text(attributes.label || nodeId);

    var root = this._selection;
    var svg = root.selectWithoutDataPropagation("svg");
    var graph0 = svg.selectWithoutDataPropagation("g");
    var graph0Datum = graph0.datum();
    var nodeData = this._extractData(node, graph0Datum.children.length, graph0.datum());
    graph0Datum.children.push(nodeData);

    insertAllElementsData(node, nodeData);

    return this

}

function createNode(nodeId, attributes) {
    var attributesString = ''
    for (var name of Object.keys(attributes)) {
        if (attributes[name] != null) {
            attributesString += ' "' + name + '"="' + attributes[name] + '"';
        }
    }
    var dotSrc = 'graph {"' + nodeId + '" [' + attributesString + ']}';
    var svgDoc = Viz(dotSrc, {format: 'svg'});
    var parser = new window.DOMParser();
    var doc = parser.parseFromString(svgDoc, "image/svg+xml");
    var newDoc = d3.select(document.createDocumentFragment())
        .append(function() {
            return doc.documentElement;
        });
    var node = newDoc.select('.node');

    return node;
}
