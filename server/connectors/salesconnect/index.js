'use strict';

/**
 * CDS Labs module
 * 
 *   Connector implementation for Salesforce
 * 
 * @author David Taieb
 */

var connector = require("../connector");
var async = require('async');
var _ = require('lodash');

/**
 * salesconnect connector
 */
function salesconnect( parentDirPath ){
	//Call constructor from super class
	connector.call(this);
	
	//Set the id
	this.setId("salesconnect");
	this.setLabel("Sugar CRM Salesconnect");
	
	//Set the steps
	this.setSteps([
    ]);
	
	/**
	 * authCallback: callback for OAuth authentication protocol
	 * @param oAuthCode
	 * @param pipeId
	 * @param callback(err, pipe )
	 */
	this.authCallback = function( oAuthCode, pipeId, callback ){
		return callback("401 Unauthorized");
	};
	
	/**
	 * connectDataSource: connect to the backend data source
	 * @param req
	 * @param res
	 * @param pipeId
	 * @param url: login url
	 * @param callback(err, results)
	 */
	this.connectDataSource = function( req, res, pipeId, url, callback ){
		return callback("401 Unauthorized");
	}
}

//Extend event Emitter
require('util').inherits(salesconnect, connector);

module.exports = new salesconnect();