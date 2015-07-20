'use strict';

/**
*	Step used to create activities for moving data from Cloudant to Dash
*	@Author: David Taieb
*/

var pipeRunStep = require('./pipeRunStep');
var dataworks = require("../dw/dataworks");
var async = require('async');
var _ = require('lodash');

/**
 * cloudantToDashActivitiesStep class
 */
function cloudantToDashActivitiesStep(){
	pipeRunStep.call(this);

	this.label = "Creating and running DataWorks activities";

		//public APIs
	this.run = function( callback ){
		var pipeRunStats = this.pipeRunStats;

		//Create a DataWorks instance
		var dwInstance = new dataworks();
		//Keep a reference of the dataWorks instance for the monitoring step
		pipeRunStats.dwInstance = dwInstance;
		var stepStats = this.stats;
		stepStats.numRunningActivities = 0;
		var numCreated = 0;

		//convenience method
		var expectedLength = this.getPipeRunner().getSourceTables().length;
		var formatStepMessage = function(){
			var percent = ((stepStats.numRunningActivities/expectedLength)*100).toFixed(1);
			this.setPercentCompletion( percent );
			var message = numCreated + " DataWorks activities created, " + stepStats.numRunningActivities + " are successfully started (" + percent + "%)";
			this.setStepMessage( message );
		}.bind(this);

		formatStepMessage();

		//Create the activities if needed
		dwInstance.listActivities( function( err, activities ){
			if ( err ){
				console.log( "Unable to get list of DataWorks activities: " + err );
				return callback( err );
			}

			async.forEachOfSeries( pipeRunStats.getTableStats(), function(tableStats, tableName, callback ){
				var checkForRunningStateFn = function( activityId, activityRunId, callback ){
					dwInstance.monitorActivityRun( activityId, activityRunId, function( err, activityRun ){
						if ( err ){
							return callback(err);
						}
						if ( dwInstance.isFinished( activityRun.status ) || dwInstance.isRunning( activityRun.status ) ){
							//console.log("Activity is running. Wait for another 5 second before moving on...");
							return setTimeout( function(){
								return callback();
							}, 100);
						}
						//console.log("Activity is not yet running, keep waiting...");
						setTimeout( function(){
							return checkForRunningStateFn(activityId, activityRunId, callback )
						}, (tableStats.numRecords && tableStats.numRecords < 1000) ? 1000 : 10000);
					})
				}
				var runActivityFn = function(activity){
					dwInstance.runActivity( activity.id, function( err, activityRun ){
						if ( err ){
							return callback( err );
						}
						tableStats.activityRunId = activityRun.id;
						stepStats.numRunningActivities++;
						formatStepMessage();
						//console.log("SuccessFully submitted a activity for running.");
						return checkForRunningStateFn( activity.id, activityRun.id, callback );
					});
				}
				var activity = _.find( activities, function( act ){
					return act.name.toLowerCase() === tableStats.dbName.toLowerCase();
				});
				if ( activity ){
					//console.log("Activity %s already exists", tableStats.dbName);
					tableStats.activityId = activity.id;

					numCreated++;
					//Run it now
					runActivityFn(activity);
				}else{
					//console.log("Creating activity for table " + tableStats.dbName );

					var srcConnection = dwInstance.newConnection("cloudant");
					srcConnection.setDbName( tableStats.dbName.toLowerCase() );
					srcConnection.addTable( {
						name: tableStats.dbName.toUpperCase()
					});
					var targetConnection = dwInstance.newConnection("dashDB");
					targetConnection.setSourceConnection( srcConnection );

					dwInstance.createActivity({
						name: tableStats.dbName,
						desc: "Generated by Pipes Tool - Cloudant to dashDB",
						srcConnection: srcConnection,
						targetConnection: targetConnection
					}, function( err, activity ){
						if ( err ){
							return callback( err );
						}

						//Record the activity id and start execution
						tableStats.activityId = activity.id;
						console.log("SuccessFully created a new activity: " + require('util').inspect( activity, { showHidden: true, depth: null } ) );
						numCreated++;
						formatStepMessage();
						//Run it now
						runActivityFn(activity);
					});
				}
			}, function(err){
				if ( err ){
					return callback(err);
				}

				formatStepMessage();
				return callback();
			});
		});
	}
}

module.exports = cloudantToDashActivitiesStep;