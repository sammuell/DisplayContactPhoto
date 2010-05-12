if (!contactPhoto) var contactPhoto = {};

contactPhoto.onLoad = function() {
	contactPhoto.photoBox = document.getElementById('DiCoP-Box');
	if (!contactPhoto.photoBox) {
		return; // only execute this function further in contactPhotoOverlay.xul
	}

	// display the photo at the right position
	contactPhoto.messageDisplay.setPhotoPosition();

	// register preferences observer
	contactPhoto.messageDisplay.prefObserver.register();

	// check if all custom headers are present
	contactPhoto.prefs.checkCustomHeaders();	

	// Check if thumbnailDirectory exists, else create it
	contactPhoto.cache.checkDirectory();

	contactPhoto.messageDisplay.imgObj = document.getElementById('DiCoP-Image');
	contactPhoto.messageDisplay.imgObj.style.background = '0px 0px no-repeat';
	contactPhoto.messageDisplay.imgObj.addEventListener('click', contactPhoto.messageDisplay.editPhoto, false);

	gMessageListeners.push(contactPhoto.messageDisplay.messageListener); // hook to endHeader notifications

	// Add an address book listener so the photo can be updated.
	Components.classes["@mozilla.org/abmanager;1"]
		.getService(Components.interfaces.nsIAbManager)
		.addAddressBookListener(contactPhoto.addressBookListener,
			Components.interfaces.nsIAbListener.all);

	contactPhoto.messageDisplay.setPhotoSize(); // set the size from the preferences

	window.addEventListener('unload', contactPhoto.onUnload, false);
}


contactPhoto.messageDisplay = {
	photoInfo: null,
	cardWindow: null,
	imgObj: null,
	
	getPhoto: function() {
		
		var headerToParse = (contactPhoto.utils.isSentMessage())? currentHeaderData['to'].headerValue: currentHeaderData['from'].headerValue;

		var hdrAddresses = {};
		var numAddresses = 0;
		var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
									.getService(Components.interfaces.nsIMsgHeaderParser);
		numAddresses = msgHeaderParser.parseHeadersWithArray(headerToParse, hdrAddresses, {}, {});

		if (numAddresses == 1) {
			contactPhoto.messageDisplay.photoInfo = contactPhoto.photoForEmailAddress(hdrAddresses.value[0]);
			contactPhoto.messageDisplay.photoInfo.size = contactPhoto.prefs.get('photoSize', 'int');
			
			if (contactPhoto.prefs.get('enableFaces', 'bool')) {
				var photoFace = gMessageDisplay.displayedMessage.getStringProperty('face');
				if (photoFace && photoFace.length > 0) {
					contactPhoto.messageDisplay.photoInfo.hasFace = true;
					contactPhoto.messageDisplay.photoInfo.faceURI = 'data:image/png;base64,'+encodeURIComponent(photoFace);
				}
			}
			
			contactPhoto.messageDisplay.photoInfo.photoObject = contactPhoto.messageDisplay.imgObj;
			contactPhoto.display.logic(contactPhoto.messageDisplay.photoInfo, true);
			
		} else { // multiple senders/receivers
			contactPhoto.messageDisplay.photoInfo = contactPhoto.utils.newPhotoInfo();
			contactPhoto.messageDisplay.photoInfo.hasGenericPhoto = true;
			contactPhoto.messageDisplay.photoInfo.hasPhoto = true;
			contactPhoto.messageDisplay.photoInfo.genericPhotoURI = 'chrome://contactPhoto/skin/genericIcons/multiple-persons.png';
		}
		
		contactPhoto.messageDisplay.photoInfo.size = contactPhoto.prefs.get('photoSize', 'int');
		contactPhoto.messageDisplay.photoInfo.photoObject = contactPhoto.messageDisplay.imgObj;
		
		contactPhoto.display.logic(contactPhoto.messageDisplay.photoInfo, true);
	},
	
	editPhoto: function(event) {
		if (event.button != 0) return;

		if (contactPhoto.messageDisplay.photoInfo 
				&& contactPhoto.messageDisplay.photoInfo.cardDetails
				&& contactPhoto.messageDisplay.photoInfo.cardDetails.card) {
			/*
			var cardWindow = window.openDialog('chrome://messenger/content/addressbook/abEditCardDialog.xul',
						  '',
						  'chrome,resizable=no,centerscreen',
						  { abURI: contactPhoto.cardDetails.book.URI,
							card: contactPhoto.cardDetails.card });
			*/

			/*
			Opening a dialog does not work as expected, instead a regular window is opened.
			The faked argument mechanism seems to work quite well, it's a bit risky, but the variables
				are set before they are used in the new window. It's not likely to produce an error, since
				it takes about 250ms to load the window on my machine. I was not able to produce any error in this way.
			Because the window is not modal, it may have to be closed 'manually' using its blur event.
			However on a double click on the image thunderbird attempts to open two windows, which crashes the
				application. That's why there is an additional check if the card is open.
			*/
			

			if (contactPhoto.messageDisplay.cardWindow && !contactPhoto.messageDisplay.cardWindow.closed) {
				contactPhoto.messageDisplay.cardWindow.close();
			}

			contactPhoto.messageDisplay.cardWindow = window.open('chrome://messenger/content/addressbook/abEditCardDialog.xul',
					'DiCoP-EditContact',
					'chrome,resizable=no,centerscreen');

			contactPhoto.messageDisplay.cardWindow.arguments = [];
			contactPhoto.messageDisplay.cardWindow.arguments[0] = {
				abURI: contactPhoto.messageDisplay.photoInfo.cardDetails.book.URI,
				card: contactPhoto.messageDisplay.photoInfo.cardDetails.card
			};

			contactPhoto.messageDisplay.cardWindow.addEventListener('load', function() {
					var abTabs = contactPhoto.messageDisplay.cardWindow.document.getElementById('abTabs');
					var photoTabButton = contactPhoto.messageDisplay.cardWindow.document.getElementById('photoTabButton');
					abTabs.selectedItem = photoTabButton;
				}, false);

			contactPhoto.messageDisplay.cardWindow.addEventListener('blur', function() {
					contactPhoto.messageDisplay.cardWindow.close();
				}, false);

		} else {
			contactPhoto.utils.customAlert(contactPhoto.localizedJS.getString('contactHasNoCard'));
		}

	},
	
	openCropWindow: function() {
		var photoURI = null;
		
		var origFile = Components.classes["@mozilla.org/file/directory_service;1"]
							.getService(Components.interfaces.nsIProperties)
							.get("ProfD", Components.interfaces.nsIFile);
		origFile.append('Photos');
		origFile.append(contactPhoto.messageDisplay.photoInfo.photoName);
		photoURI = contactPhoto.utils.makeURI(origFile);
		
		// the crop option should not be available if there is no card
		var card = contactPhoto.messageDisplay.photoInfo.cardDetails.card;

		var cropW = card.getProperty('CropPhotoWidth', '');
		var cropH = card.getProperty('CropPhotoHeight', '');
		var cropL = card.getProperty('CropPhotoLeft', '');
		var cropT = card.getProperty('CropPhotoTop', '');
		
		// do not set any cropping area if the photo has been changed
		if (card.getProperty('CropPhotoName', '') != contactPhoto.messageDisplay.photoInfo.photoName) {
			cropW = '';
			cropH = '';
			cropL = '';
			cropT = '';
		};

		var arguments = {
			photoURI: photoURI,
			width: cropW,
			height: cropH,
			left: cropL,
			top: cropT,
		};
		
		var returnValues = {
			cropAreaChanged: false
		};

		window.openDialog('chrome://contactPhoto/content/cropPhoto.xul', 'contactPhotoCrop', 'chrome,dialog,modal,resizable,centerscreen', arguments, returnValues);

		if (returnValues.cropAreaChanged) {
			if (returnValues.doNotCrop) {
				card.setProperty('CropPhotoName', '');
				card.setProperty('CropPhotoWidth', '');
				card.setProperty('CropPhotoHeight', '');
				card.setProperty('CropPhotoLeft', '');
				card.setProperty('CropPhotoTop', '');
			} else {
				card.setProperty('CropPhotoName', contactPhoto.messageDisplay.photoInfo.photoName);
				card.setProperty('CropPhotoWidth', returnValues.width);
				card.setProperty('CropPhotoHeight', returnValues.height);
				card.setProperty('CropPhotoLeft', returnValues.left);
				card.setProperty('CropPhotoTop', returnValues.top);
			}
			
			contactPhoto.cache.removeThumbnail(contactPhoto.messageDisplay.photoInfo.photoName);
			
			contactPhoto.messageDisplay.photoInfo.cardDetails.book.modifyCard(card);
		}
	},
	
	messageListener: {
		onStartHeaders: function() {},
		onEndHeaders: function() {
			contactPhoto.messageDisplay.getPhoto();
		},
		onEndAttachments: function() {},
		onBeforeShowHeaderPane: function() {}
	},
	
	setPhotoPosition: function() {
		var photoPos = contactPhoto.prefs.get('photoPosition', 'char');
		var photoBox = document.getElementById('DiCoP-Box');
		var parent = photoBox.parentNode; // save reference to parent node

		if (photoPos == 'left') { // default is left side
			parent.removeChild(photoBox);
			parent.insertBefore(photoBox, parent.firstChild);
		} else { // display on the right side
			parent.removeChild(photoBox);
			parent.appendChild(photoBox);
		}
	},
	
	setPhotoSize: function() {
		var photoSize = contactPhoto.prefs.get('photoSize', 'int');
		document.getElementById('DiCoP-Box').style.minWidth = photoSize+'px';
		document.getElementById('DiCoP-Box').style.maxWidth = photoSize+'px';
		contactPhoto.messageDisplay.imgObj.style.maxWidth = photoSize+'px';
		contactPhoto.messageDisplay.imgObj.style.maxHeight = photoSize+'px';
	},
	
	prefObserver: {
		register: function() {
			contactPhoto.prefs.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
			contactPhoto.prefs.branch.addObserver('', contactPhoto.messageDisplay.prefObserver, false);
		},
		
		unregister: function() {
			if (contactPhoto.prefs.branch) {
				contactPhoto.prefs.branch.removeObserver('', contactPhoto.messageDisplay.prefObserver);
			}
		},

		observe: function(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed') return;

			//alert(aData)

			// aSubject is the nsIPrefBranch we're observing (after appropriate QI)
			// aData is the name of the pref that's been changed (relative to aSubject)
			switch (aData) {
				case 'photoSize':
				contactPhoto.cache.clear();
				contactPhoto.messageDisplay.setPhotoSize();
				contactPhoto.display.logic(contactPhoto.messageDisplay.photoInfo, true);
				break;

				case 'photoPosition':
				contactPhoto.messageDisplay.setPhotoPosition();
				break;

				case 'defaultPhoto':
				case 'overrideFaces':
				case 'defaultGenericPhoto':
				case 'enableGravatar':
				contactPhoto.display.logic(contactPhoto.messageDisplay.photoInfo, true);
				break;

				case 'enableFaces':
				case 'enableLocalPhotos':
				case 'specialFoldersUseToHeaders':
				contactPhoto.messageDisplay.getPhoto();
				break;

				case 'defaultGravatar':
				case 'drawBackgroundColor':
				case 'backgroundColor':
				case 'effectBorder':
				case 'effectBorderColor':
				case 'effectBorderType':
				case 'effectRoundedCorners':
				case 'effectGloss':
				case 'effectGlossType':
				case 'effectShadow':
				contactPhoto.cache.clear();
				contactPhoto.display.logic(contactPhoto.messageDisplay.photoInfo, true);
				break;
			}
		}
	}
}


contactPhoto.onUnload = function() {
	contactPhoto.messageDisplay.imgObj.removeEventListener('click', contactPhoto.messageDisplay.editPhoto, false);

	Components.classes["@mozilla.org/abmanager;1"]
		.getService(Components.interfaces.nsIAbManager)
		.removeAddressBookListener(contactPhoto.addressBookListener);

	contactPhoto.messageDisplay.prefObserver.unregister();
}

contactPhoto.addressBookListener = {
	onItemAdded: function(aParentDir, aItem) {
		contactPhoto.messageDisplay.messageListener.onEndHeaders();
	},

	onItemRemoved: function(aParentDir, aItem) {
		contactPhoto.messageDisplay.messageListener.onEndHeaders();
	},

	onItemPropertyChanged: function(aItem, aProperty, aOldValue, aNewValue) {
		contactPhoto.messageDisplay.messageListener.onEndHeaders();
	}
}

window.addEventListener('load', contactPhoto.onLoad, false);