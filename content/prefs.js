function initPreferences() {
	updateColorPicker('backgroundColorPicker', 'backgroundColorPreview');
	updateColorPicker('borderColorPicker', 'borderColorPreview');
	
	// display path of photo directory
	// automatic setting and getting of this pref does not work...
	var dirTextbox = document.getElementById('enableLocalPhotosTextbox');
	var directory = contactPhoto.prefs.get('photoDirectory', 'file');
	if (directory.path) {
		dirTextbox.value = directory.path;
	}
	
	enableLocalOptions();
	enableFacesOptions();
	enableBorderTypes();
	enableBackgroundColor();
	
	populateDefaultGenericPhotoList();
}
window.addEventListener('load', initPreferences, false); // display the color

function updateColorPicker(pickerID, textboxID) {
	var textbox = document.getElementById(textboxID);
	var picker = document.getElementById(pickerID);

	// sanitize hex color
	var re = new RegExp(/^#[0-9a-f]*$/i);
	var hexCode = textbox.value;
	if (hexCode.substr(0, 1) != '#') hexCode = '#'+hexCode;
	while (!re.test(hexCode)) {
		hexCode = hexCode.substr(0, hexCode.length-1);
	}
	textbox.value = hexCode;

	if (hexCode.length == 7) {
		picker.color = hexCode;
	} else {
		//picker.color = 'transparent';
	}
}

function updateColorInput(pickerID, prefName) {
	var picker = document.getElementById(pickerID);

	contactPhoto.prefs.set(prefName, picker.color, 'char');
}

function setColor(pickerID, prefName, color) {
	var picker = document.getElementById(pickerID);
	picker.color = color;
	updateColorInput(pickerID, prefName);
}

function enableFacesOptions() {
	if (document.getElementById('enableFacesCheckbox').checked) {
		document.getElementById('enableFacesRadiogroup').disabled = false;
	} else {
		document.getElementById('enableFacesRadiogroup').disabled = true;
	}
}

function enableLocalOptions() {
	if (document.getElementById('enableLocalPhotosCheckbox').checked) {
		document.getElementById('enableLocalPhotosButton').disabled = false;
		document.getElementById('enableLocalPhotosTextbox').disabled = false;
		document.getElementById('checkboxEnableWildcards').disabled = false;
	} else {
		document.getElementById('enableLocalPhotosButton').disabled = true;
		document.getElementById('enableLocalPhotosTextbox').disabled = true;
		document.getElementById('checkboxEnableWildcards').disabled = true;
	}
	enableOpenLocalFolder();
}

function enableOpenLocalFolder() {
	if (document.getElementById('enableLocalPhotosTextbox').value == '') {
		document.getElementById('openLocalFolderButton').disabled = true;
	} else {
		document.getElementById('openLocalFolderButton').disabled = false;
	}
}

function enableBorderTypes() {
	if (document.getElementById('enableBorderCheckbox').checked) {
		document.getElementById('borderTypes').disabled = false;
		document.getElementById('borderColorPreview').disabled = false;
		document.getElementById('borderColorPicker').disabled = false;
		document.getElementById('colorDefaultBlack').disabled = false;
		document.getElementById('colorDefaultWhite').disabled = false;
	} else {
		document.getElementById('borderTypes').disabled = true;
		document.getElementById('borderColorPreview').disabled = true;
		document.getElementById('borderColorPicker').disabled = true;
		document.getElementById('colorDefaultBlack').disabled = true;
		document.getElementById('colorDefaultWhite').disabled = true;
	}
}

function enableBackgroundColor() {
	if (document.getElementById('enableBackgroundColorCheckbox').checked) {
		document.getElementById('backgroundColorPicker').disabled = false;
		document.getElementById('backgroundColorPreview').disabled = false;
	} else {
		document.getElementById('backgroundColorPicker').disabled = true;
		document.getElementById('backgroundColorPreview').disabled = true;
	}
}

function enableGlossOptions() {
	if (document.getElementById('checkboxEnableGloss').checked) {
		document.getElementById('effectGlossTypes').disabled = false;
	} else {
		document.getElementById('effectGlossTypes').disabled = true;
	}
}

function selectPhotoDirectory() {
	var dirTextbox = document.getElementById('enableLocalPhotosTextbox');

	const nsIFilePicker = Components.interfaces.nsIFilePicker;

	var title = contactPhoto.localizedJS.getString('selectDirectory');
	var picker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	picker.init(window, title, nsIFilePicker.modeGetFolder);

	try {
		var initDir = Components.classes["@mozilla.org/file/local;1"]
						.createInstance(Components.interfaces.nsILocalFile);
		initDir.initWithPath(dirTextbox.value);
		picker.displayDirectory = initDir;
	} catch (ex) { }

	if (picker.show() == nsIFilePicker.returnOK){
		var directory = picker.file;
		dirTextbox.value = directory.path;

		// automatic setting and getting of this pref does not work...
		contactPhoto.prefs.set('photoDirectory', directory, 'file');
	}

	enableOpenLocalFolder();
}

function openPhotoDirectory() {
	var dirTextbox = document.getElementById('enableLocalPhotosTextbox');

	try {
		var localDir = Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
		localDir.initWithPath(dirTextbox.value);
		localDir.launch();
	} catch (ex) {
		contactPhoto.utils.customAlert(contactPhoto.localizedJS.getString('directoryOpenError'));
	}
}

function clearCache() {
	if (contactPhoto.cache.clear()) {
		contactPhoto.utils.customAlert(contactPhoto.localizedJS.getString('cacheCleared'));
	} else {
		contactPhoto.utils.customAlert(contactPhoto.localizedJS.getString('cacheClearedError'));
	}
}

function populateDefaultGenericPhotoList() {
	contactPhoto.genericPhotos.load();

	var genericPhotoList = document.getElementById('listDefaultPhoto');
	var oldPhotoListValue = genericPhotoList.value;

	var menupop = genericPhotoList.getElementsByTagName('menupopup')[0];
	
	for (var i=0; i<contactPhoto.genericPhotos.count; i++) {
		var currentPhoto = contactPhoto.genericPhotos.list[i];
		var newItem = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'menuitem');
		newItem.setAttribute('label', currentPhoto.label);
		newItem.setAttribute('value', currentPhoto.large);
		newItem.setAttribute('image', currentPhoto.tiny);
		newItem.setAttribute('class', 'menuitem-iconic');
		menupop.appendChild(newItem);
	}
	
	document.getElementById('extensions.contactPhoto.defaultGenericIcon').updateElements();
}

function loadWebsite(e) {
	if (e.button == 0) {
		window.opener.openURL(e.target.value);
	}
}
