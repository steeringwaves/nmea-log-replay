function DisplayWarning(data) {
	$(".alertify-log").each(function () {
		if ($(this).html() == data) {
			$(this).click();
		}
	});

	Alertify.log.error(data.replace(/(?:\r\n|\r|\n)/g, "<br />"), 10000);
}

function DisplayNotification(data) {
	$(".alertify-log").each(function () {
		if ($(this).html() == data) {
			$(this).click();
		}
	});

	Alertify.log.success(data.replace(/(?:\r\n|\r|\n)/g, "<br />"), 10000);
}

function CheckIfIPAddress(input) {
	var valid = "0123456789.";
	var temp;

	if (undefined != input.value) {
		/*Input Form*/
		for (var i = 0; i < input.value.length; i++) {
			temp = "" + input.value.substring(i, i + 1);

			if (valid.indexOf(temp) == "-1") return false;
		}

		var ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		var ipArray = input.value.match(ipPattern);

		if (input.value == "0.0.0.0") {
			return false;
		} else if (input.value == "255.255.255.255") {
			return false;
		}

		if (ipArray == null) {
			return false;
		} else {
			for (i = 1; i < 5; i++) {
				thisSegment = ipArray[i];

				if (thisSegment > 255) {
					return false;
					i = 4;
				}
			}
		}
		extensionLength = 3;

		return true;
	} /*Object Value*/ else {
		for (var i = 0; i < input.length; i++) {
			temp = "" + input.substring(i, i + 1);

			if (valid.indexOf(temp) == "-1") return false;
		}

		var ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		var ipArray = input.match(ipPattern);

		if (input == "0.0.0.0") {
			return false;
		} else if (input == "255.255.255.255") {
			return false;
		}

		if (ipArray == null) {
			return false;
		} else {
			for (i = 1; i < 5; i++) {
				thisSegment = ipArray[i];

				if (thisSegment > 255) {
					return false;
					i = 4;
				}
			}
		}
		extensionLength = 3;

		return true;
	}
}

function VerifyNumberBounds(input) {
	var temp_input_value;
	temp_input_value = parseFloat(input);

	if (temp_input_value > Number.MAX_VALUE) {
		return false;
	}

	if (temp_input_value < Number.MIN_VALUE) {
		return false;
	}

	return true;
}

function VerifyNumeric(input) {
	var valid = "0123456789.-";
	var temp;

	for (var i = 0; i < input.length; i++) {
		temp = "" + input.substring(i, i + 1);

		if (valid.indexOf(temp) == "-1") return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyWholeNumeric(input) {
	var valid = "0123456789-";
	var temp;

	for (var i = 0; i < input.length; i++) {
		temp = "" + input.substring(i, i + 1);

		if (valid.indexOf(temp) == "-1") return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyDecimalNumber(input) {
	if (false == VerifyNumeric(input)) {
		return false;
	}

	var numberFloat = parseFloat(input, 10);

	if (isNaN(numberFloat)) {
		return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyPositiveDecimalNumber(input) {
	if (false == VerifyNumeric(input)) {
		return false;
	}

	var numberUFloat = parseFloat(input, 10);

	if (numberUFloat < 0 || isNaN(numberUFloat)) {
		return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyWholeNumber(input) {
	if (false == VerifyWholeNumeric(input)) {
		return false;
	}

	var numberInt = parseInt(input, 10);

	if (isNaN(numberInt)) {
		return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyPositiveWholeNumber(input) {
	if (false == VerifyWholeNumeric(input)) {
		return false;
	}

	var numberUInt = parseInt(input, 10);

	if (numberUInt < 0 || isNaN(numberUInt)) {
		return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyNegativeWholeNumber(input) {
	if (false == VerifyWholeNumeric(input)) {
		return false;
	}

	var numberUInt = parseInt(input, 10);

	if (numberUInt > 0 || isNaN(numberUInt)) {
		return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyPortNumber(input) {
	if (false == VerifyPositiveWholeNumber(input)) {
		return false;
	}

	var numberUInt = parseInt(input, 10);

	if (numberUInt <= 0 || numberUInt > 65535) {
		return false;
	}

	if (false == VerifyNumberBounds(input)) return false;

	return true;
}

function VerifyASCIIPrintableText(input) {
	var valid = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"; //TODO special characters are not currently supported
	//var valid = "0123456789@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	var temp;

	for (var i = 0; i < input.length; i++) {
		temp = "" + input.substring(i, i + 1);

		if (valid.indexOf(temp) == "-1") return false;
	}

	return true;
}
