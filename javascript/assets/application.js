//global.$ = $;

const remote = require("@electron/remote");
const { Menu, BrowserWindow, MenuItem, shell, dialog } = remote;

const os = require("os");
const fs = require("fs");
const net = require("net");

var HISTORY_FILENAME = os.tmpdir() + "/NMEALogReplayHistory.json";
var SettingsObject = null;
var SettingsFileData = null;
var DefaultSettingsJSON = '{"Log":"", "Port": 9999, "Trigger": "", "Delay": 1000, "CourseOverGroundEnabled": false}';

function ReadSettings() {
	fs.readFile(HISTORY_FILENAME, "utf-8", function (error, contents) {
		SettingsFileData = contents;

		if (null != SettingsFileData && "" != SettingsFileData) {
			try {
				SettingsObject = JSON.parse(SettingsFileData);
			} catch (e) {
				SettingsObject = JSON.parse(DefaultSettingsJSON);
			}
		} else {
			SettingsObject = JSON.parse(DefaultSettingsJSON);
		}

		if (undefined != SettingsObject.Log) {
			$("#log").val(SettingsObject.Log);
		}

		if (undefined != SettingsObject.Port) {
			$("#port").val(SettingsObject.Port);
		}

		if (undefined != SettingsObject.Trigger) {
			$("#trigger").val(SettingsObject.Trigger);
		}

		if (undefined != SettingsObject.CourseOverGroundEnabled) {
			$("#cog").prop("checked", SettingsObject.CourseOverGroundEnabled);
		}

		if (undefined != SettingsObject.Delay) {
			$("#delay").val(SettingsObject.Delay);
		}
	});
}

function WriteSettings(log, port, delay, trigger, cog) {
	if (
		SettingsObject.Log != log ||
		SettingsObject.Port != port ||
		SettingsObject.Trigger != trigger ||
		SettingsObject.CourseOverGroundEnabled != cog ||
		SettingsObject.Delay != delay
	) {
		SettingsObject.Log = log;
		SettingsObject.Port = port;
		SettingsObject.Trigger = trigger;
		SettingsObject.CourseOverGroundEnabled = cog;
		SettingsObject.Delay = delay;

		try {
			SettingsFileData = JSON.stringify(SettingsObject);
		} catch (e) {
			SettingsObject = JSON.parse(DefaultSettingsJSON);
		}

		fs.writeFileSync(HISTORY_FILENAME, SettingsFileData);
	}
}

function InitMenu() {
	var template = [
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "delete" },
				{ role: "selectall" }
			]
		},
		///*
		{
			label: "View",
			submenu: [{ role: "reload" }, { role: "forcereload" }, { role: "toggledevtools" }]
		},
		//*/
		{
			role: "window",
			submenu: [{ role: "minimize" }, { role: "close" }]
		}
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

$(function () {
	/*-----------------------------------------------------------------------------------*/
	/*	Anchor Link
	/*-----------------------------------------------------------------------------------*/
	$("a[href*=#]:not([href=#])").click(function () {
		if (location.pathname.replace(/^\//, "") == this.pathname.replace(/^\//, "") || location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $("[name=" + this.hash.slice(1) + "]");
			if (target.length) {
				$("html,body").animate(
					{
						scrollTop: target.offset().top
					},
					1000
				);
				return false;
			}
		}
	});

	/*-----------------------------------------------------------------------------------*/
	/*  Tooltips
	/*-----------------------------------------------------------------------------------*/
	$(".tooltip-side-nav").tooltip();

	ReadSettings();
	InitMenu();
	StopServer();
});

var GlobalServer = undefined;
var GlobalServerClients = [];
var GlobalServerUpdateTimeout = undefined;
var GlobalPaused = false;

var GlobalLogData = undefined;
var GlobalLogDataLines = undefined;
var GlobalLogDataIndex = 0;
var GlobalLogDataLength = 0;

function ResumeServer() {
	$("#pause_server").attr("onclick", "PauseServer();");
	$("#pause_server").text("Pause Server");

	GlobalPaused = false;
}

function PauseServer() {
	$("#pause_server").attr("onclick", "ResumeServer();");
	$("#pause_server").text("Resume Server");

	GlobalPaused = true;
}

function StopServer() {
	if (GlobalServerUpdateTimeout != undefined) {
		clearTimeout(GlobalServerUpdateTimeout);
		GlobalServerUpdateTimeout = undefined;
	}

	for (var i = 0; i < GlobalServerClients.length; i++) {
		GlobalServerClients[i].end();
	}

	GlobalServerClients = [];

	if (GlobalServer != undefined) {
		GlobalServer.close();
		GlobalServer = undefined;
	}

	GlobalLogData = undefined;
	GlobalLogDataLines = undefined;
	GlobalLogDataIndex = 0;
	GlobalLogDataLength = 0;

	$("#start_server").attr("onclick", "StartServer();");
	$("#start_server").text("Start Server");

	$("#result").html("");

	ResumeServer();
}

async function ChooseLog() {
	var response = await dialog.showOpenDialog({ properties: ["openFile"] });

	var filename = "";

	if (typeof response === "object") {
		if (typeof response.filePaths === "object") {
			if (typeof response.filePaths[0] === "string") {
				filename = response.filePaths[0];
			}
		}
	}

	$("#log").val(filename);
}

function SettingsChanged() {
	var log = $("#log").val().toString();
	var port = $("#port").val().toString();
	var delay = $("#delay").val().toString();
	var trigger = $("#trigger").val().toString();
	var cog = $("#cog").is(":checked");
	var warnings = "";

	if (false == fs.existsSync(log)) {
		warnings += "No valid Log specified\n";
		$("#log").val(SettingsObject.Log);
	}

	if (false == VerifyASCIIPrintableText(trigger) && trigger != "") {
		warnings += "No valid Trigger specified\n";
	}

	if (false == VerifyPortNumber(port)) {
		warnings += "No valid Port specified\n";
		$("#port").val(SettingsObject.Port);
	}

	if (false == VerifyPositiveWholeNumber(delay)) {
		warnings += "No valid Delay specified \n";
		$("#delay").val(SettingsObject.Delay);
	}

	if (warnings != "") {
		//DisplayWarning(warnings);
		return;
	}

	if (log == "" || delay == "" || port == "") {
		return;
	}

	WriteSettings(log, port, delay, trigger, cog);
}

function StartServer() {
	StopServer();

	var log = $("#log").val().toString();
	var port = $("#port").val().toString();
	var delay = $("#delay").val().toString();
	var trigger = $("#trigger").val().toString();
	var cog = $("#cog").is(":checked");
	var warnings = "";

	if (false == fs.existsSync(log)) {
		warnings += "No valid Log specified\n";
	}

	if (false == VerifyASCIIPrintableText(trigger) && trigger != "") {
		warnings += "No valid Trigger specified\n";
	}

	if (false == VerifyPortNumber(port)) {
		warnings += "No valid Port specified\n";
	}

	if (false == VerifyPositiveWholeNumber(delay)) {
		warnings += "No valid Delay specified " + heading_offset + "\n";
	}

	if (warnings != "") {
		DisplayWarning(warnings);
		return;
	}

	if (log == "" || delay == "" || port == "") {
		return;
	}

	WriteSettings(log, port, delay, trigger, cog);

	ReadLogFile(log);

	RunServer();

	$("#start_server").attr("onclick", "StopServer();");
	$("#start_server").text("Stop Server");
}

function ReadLogFile(log) {
	fs.readFile(log, "utf-8", function (error, contents) {
		SettingsFileData = contents;

		if (null != contents && "" != contents) {
			GlobalLogData = contents;
		} else {
			GlobalLogData = undefined;
		}
	});
}

function RunServer(port, delay, trigger, cog) {
	if (GlobalServerUpdateTimeout != undefined) {
		clearTimeout(GlobalServerUpdateTimeout);
		GlobalServerUpdateTimeout = undefined;
	}

	GlobalServerUpdateTimeout = setTimeout(SendNMEAData, SettingsObject.Delay);

	// Start a TCP Server
	GlobalServer = net
		.createServer(function (socket) {
			// Identify this client
			socket.name = socket.remoteAddress + ":" + socket.remotePort;

			// Put this new client in the list
			GlobalServerClients.push(socket);

			// Handle incoming messages from GlobalServerClients.
			socket.on("data", function (data) {});

			// Remove the client from the list when it leaves
			socket.on("end", function () {
				GlobalServerClients.splice(GlobalServerClients.indexOf(socket), 1);
			});

			socket.on("error", function (error) {
				console.error(error);
				GlobalServerClients.splice(GlobalServerClients.indexOf(socket), 1);
				socket.destroy();
			});
		})
		.listen(SettingsObject.Port);
}

function CalculateNMEAChecksum(text) {
	// Compute the checksum by XORing all the character values in the string.
	var checksum = 0;
	for (var i = 0; i < text.length; i++) {
		checksum = checksum ^ text.charCodeAt(i);
	}

	// Convert it to hexadecimal (base-16, upper case, most significant nybble first).
	var hexsum = Number(checksum).toString(16).toUpperCase();

	if (hexsum.length < 2) {
		hexsum = ("00" + hexsum).slice(-2);
	}

	return hexsum;
}

Number.prototype.pad = function (size) {
	var s = String(this);
	while (s.length < (size || 2)) {
		s = "0" + s;
	}
	return s;
};

const M_PI = 3.14159265358979323846; /* pi */
const M_PI_180 = 0.01745329251994329576922; /* pi/180 */
const M_180_PI = 57.29577951308232087685; /* 180/pi */

function DegreesToRadians(x) {
	return x * M_PI_180;
}
function RadiansToDegrees(x) {
	return x * M_180_PI;
}

function CalculateBearing(local_latitude, local_longitude, remote_latitude, remote_longitude) {
	var bearing;

	/* Convert degrees to radians */
	var local_lat_rads = local_latitude * M_PI_180;
	var local_lon_rads = local_longitude * M_PI_180;
	var remote_lat_rads = remote_latitude * M_PI_180;
	var remote_lon_rads = remote_longitude * M_PI_180;

	bearing = Math.atan2(
		Math.sin(remote_lon_rads - local_lon_rads) * Math.cos(remote_lat_rads),
		Math.cos(local_lat_rads) * Math.sin(remote_lat_rads) -
			Math.sin(local_lat_rads) * Math.cos(remote_lat_rads) * Math.cos(remote_lon_rads - local_lon_rads)
	);

	/* Convert bearing from radians to degrees */
	return RadiansToDegrees(bearing);
}

function ConvertNMEAGPSToDecimalDegrees(lat, lat_dir, lon, lon_dir) {
	var lat_int = parseInt(lat / 100);
	var latitude = lat_int + (lat - lat_int * 100) / 60;

	if (lat_dir == "S") {
		latitude *= -1;
	}

	var lon_int = parseInt(lon / 100);
	var longitude = lon_int + (lon - lon_int * 100) / 60;

	if (lon_dir == "W") {
		longitude *= -1;
	}

	return [longitude, latitude];
}

var PreviousLocation = null;
var CurrentLocation = null;

var BearingArrayIndex = 0;
var BearingArraySize = 10;
var BearingArray = [];

for (var i = 0; i < BearingArraySize; i++) {
	BearingArray.push({ bearing: 0, valid: false });
}

function SendNMEAData() {
	var nmea = "";
	var lines_printed_between_triggers = 0;

	if (undefined != GlobalLogData && undefined == GlobalLogDataLines) {
		GlobalLogDataLines = GlobalLogData.split(/\r|\n/);
		GlobalLogDataIndex = 0;
		GlobalLogDataLength = GlobalLogDataLines.length;
	}

	CurrentLocation = null;

	if (undefined != GlobalLogDataLines) {
		for (i = GlobalLogDataIndex; i < GlobalLogDataLength; i++) {
			line = GlobalLogDataLines[i];

			if (line.indexOf("$") == 0) {
				line = line.replace(/\$/g, ""); // Remove $
				line = line.replace(/\*.*/g, ""); // Remove evertying after *

				var d = new Date();
				var timestamp =
					d.getUTCHours().pad(2) +
					d.getUTCMinutes().pad(2) +
					d.getUTCSeconds().pad(2) +
					"." +
					d.getUTCMilliseconds().pad(3);

				if (line.indexOf("GGA") >= 0) {
					line = line.replace(/GGA,.*?,/g, "GGA," + timestamp + ",");
					line = line.replace(/W,.*?,/g, "W,5,"); // Set GPS Fix to 5
					line = line.replace(/E,.*?,/g, "E,5,"); // Set GPS Fix to 5

					var vars = line.split(",");
					var lat = parseFloat(vars[2]);
					var lat_dir = vars[3];
					var lon = parseFloat(vars[4]);
					var lon_dir = vars[5];

					CurrentLocation = ConvertNMEAGPSToDecimalDegrees(lat, lat_dir, lon, lon_dir);
				} else if (line.indexOf("RMC") >= 0) {
					line = line.replace(/RMC,.*?,/g, "RMC," + timestamp + ",");

					var vars = line.split(",");
					var lat = parseFloat(vars[3]);
					var lat_dir = vars[4];
					var lon = parseFloat(vars[5]);
					var lon_dir = vars[6];

					CurrentLocation = ConvertNMEAGPSToDecimalDegrees(lat, lat_dir, lon, lon_dir);
				} else if (line.indexOf("PSAT,HPR,") >= 0) {
					line = line.replace(/PSAT,HPR,.*?,/g, "PSAT,HPR," + timestamp + ",");
				}

				var checksum = CalculateNMEAChecksum(line);

				nmea += "$" + line + "*" + checksum + "\n";

				lines_printed_between_triggers++;

				if (trigger == "") {
					i++;
					break;
				} else if (line.indexOf(SettingsObject.Trigger) >= 0) {
					i++;
					break;
				} else {
					/* Default to only allow max 20 lines between line triggers */
					if (lines_printed_between_triggers > 20) {
						break;
					}
				}
			} else if (line.indexOf("!") == 0) {
				line = line.replace(/\!/g, ""); // Remove $
				line = line.replace(/\*.*/g, ""); // Remove evertying after *

				var checksum = CalculateNMEAChecksum(line);

				nmea += "!" + line + "*" + checksum + "\n";

				lines_printed_between_triggers++;

				if (trigger == "") {
					i++;
					break;
				} else if (line.indexOf(SettingsObject.Trigger) >= 0) {
					i++;
					break;
				} else {
					/* Default to only allow max 20 lines between line triggers */
					if (lines_printed_between_triggers > 20) {
						break;
					}
				}
			}
		}

		if (false == GlobalPaused) {
			/* Only increment this index if we aren't paused */
			GlobalLogDataIndex = i;
		}

		if (GlobalLogDataIndex >= GlobalLogDataLength) {
			GlobalLogDataIndex = 0;
		}
	}

	if (null != CurrentLocation) {
		if (null == PreviousLocation) {
			PreviousLocation = CurrentLocation;
		} else if (PreviousLocation[0] != CurrentLocation[0] || PreviousLocation[1] != CurrentLocation[1]) {
			BearingArray[BearingArrayIndex].bearing = CalculateBearing(
				PreviousLocation[1],
				PreviousLocation[0],
				CurrentLocation[1],
				CurrentLocation[0]
			);
			PreviousLocation = CurrentLocation;

			BearingArray[BearingArrayIndex].valid = true;
			BearingArrayIndex++;

			if (BearingArrayIndex >= BearingArraySize) {
				BearingArrayIndex = 0;
			}

			if (true == SettingsObject.CourseOverGroundEnabled) {
				var bearing = 0;
				var bearing_sum = 0;
				var num_bearings_in_avg = 0;
				for (var i = 0; i < BearingArraySize; i++) {
					if (true == BearingArray[i].valid) {
						bearing_sum += BearingArray[i].bearing;
						num_bearings_in_avg++;
					}
				}

				bearing = bearing_sum / num_bearings_in_avg;

				var heading_line = "HEHDT," + bearing.toFixed(2) + ",T";
				var checksum = CalculateNMEAChecksum(heading_line);

				nmea += "$" + heading_line + "*" + checksum + "\n";
			}
		}
	}

	$("#result").html(nmea.replace(/(?:\r\n|\r|\n)/g, "<br />"));

	for (var i = 0; i < GlobalServerClients.length; i++) {
		GlobalServerClients[i].write(nmea);
	}

	if (GlobalServerUpdateTimeout != undefined) {
		clearTimeout(GlobalServerUpdateTimeout);
		GlobalServerUpdateTimeout = undefined;
	}

	GlobalServerUpdateTimeout = setTimeout(SendNMEAData, SettingsObject.Delay);
}
