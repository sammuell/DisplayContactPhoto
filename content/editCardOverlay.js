if (!contactPhoto) var contactPhoto = {};

contactPhoto.editCard = {
	displayGenericPhotos: function() {
		// display more generic photos. copy them from the hidden list to the #GenericPhotoList
	
		/** replace elements inside <vbox id="GenericPhotoContainer">:
		 * <vbox id="GenericPhotoContainer">
		 *	<radio id="GenericPhotoType"/>
		 *	<menulist id="GenericPhotoList"/>
         * </vbox>
		 *
		 * -- with --
		 *
		 * <vbox id="GenericPhotoContainer">
		 *  <hbox id="DCP-GenericUpperHbox">
		 *	  <radio id="GenericPhotoType"/>
		 *    <label id="DCP-LabelIsDefaultPhoto"/>
		 *  </hbox>
		 *  <hbox id="DCP-GenericLowerHbox">
		 *	  <menulist id="GenericPhotoList"/>
		 *    <button id="DCP-ButtonSetDefaultPhoto"/>
		 *  </hbox>
         * </vbox>
		 */
		var upperHbox = document.getElementById('DCP-GenericUpperHbox');
		var lowerHbox = document.getElementById('DCP-GenericLowerHbox');
		
		var genericPhotoType = document.getElementById('GenericPhotoType');
		var genericPhotoList = document.getElementById('GenericPhotoList');
		
		upperHbox.insertBefore(genericPhotoType, upperHbox.firstChild);
		lowerHbox.insertBefore(genericPhotoList, lowerHbox.firstChild);
		
		
		var menupopup = genericPhotoList.firstChild;
		
		// update existing entries to iconic style
		for (var i=0; i<menupopup.childNodes.length; i++) {
			menupopup.childNodes[i].className += ' menuitem-iconic';
		}

		var templateList = document.getElementById('DCP-GenericPhotoListTemplate');
		var templateMenupopup = templateList.firstChild;
		
		for (var i=0; i<templateMenupopup.childNodes.length; i++) {
			var clone = templateMenupopup.childNodes[i].cloneNode(true);
			menupopup.appendChild(clone);
		}
		
	},
	
	setDefaultPhoto: function() {
		// select generic radio button
		document.getElementById("PhotoType").value = 'generic';
		
		var genericPhotoList = document.getElementById('GenericPhotoList');
		genericPhotoList.value = contactPhoto.prefs.get('defaultGenericPhoto', 'char');
	},
	
	newGenericPhotoHandler: {
		onLoad: function(aCard, aDocument) {
			var genericPhotoList = document.getElementById('GenericPhotoList');
			
			var photoURI = aCard.getProperty('PhotoURI', '');
			genericPhotoList.value = photoURI;
			
			return true;
		},

		onShow: function(aCard, aDocument, aTargetID) {
			var genericPhotoList = document.getElementById('GenericPhotoList');
			
			aDocument.getElementById(aTargetID).setAttribute('src', genericPhotoList.value);
			return true;
		},

		onSave: function(aCard, aDocument) {
			// If we had the photo saved locally, clear it.
			removePhoto(aCard.getProperty('PhotoName', null));
			aCard.setProperty('PhotoName', null);
			aCard.setProperty('PhotoType', 'generic');
			
			// do not save the URI if it is the default photo
			var genericPhotoList = document.getElementById('GenericPhotoList');
			
			var newURI = genericPhotoList.value;
			if (genericPhotoList.value == contactPhoto.prefs.get('defaultGenericPhoto', 'char')) {
				newURI = null;
			}
			
			aCard.setProperty('PhotoURI', newURI);
			return true;
		}
	},
	
	// check if gravatar is enabled, else disable menuitem and assign default URI if gravatar has been selected
	// select the correct default photo from DCP prefs
	checkDCPDefaultPrefs: function() {
		var genericPhotoList = document.getElementById('GenericPhotoList');
		var DCPDefaultPhoto = contactPhoto.prefs.get('defaultGenericPhoto', 'char');
		
		// disable gravatar if it is not enabled and deselect the menuitem if necessary
		if (contactPhoto.prefs.get('enableGravatar', 'bool') == false) {
			var menuitemGravatar = document.getElementById('DCP-GenericPhotoGravatar');
			
			if (menuitemGravatar.selected) {
				genericPhotoList.value = DCPDefaultPhoto;
			}
			
			menuitemGravatar.disabled = true;
		}
		
		// add the default photo label to the right menuitem
		// select the default photo if necessary
		var menupopup = genericPhotoList.firstChild;
		for (var i=0; i<menupopup.childNodes.length; i++) {
			if (menupopup.childNodes[i].value == DCPDefaultPhoto) {
				menupopup.childNodes[i].label = menupopup.childNodes[i].label +' '+ document.getElementById('DCP-LabelIsDefaultPhoto').value;
				
				if (document.getElementById("PhotoType").value == 'generic'
						&& !genericPhotoList.value) {
					genericPhotoList.value = DCPDefaultPhoto;
				}
				break;
			}
		}
	},
}

RegisterLoadListener(contactPhoto.editCard.displayGenericPhotos);

registerPhotoHandler('generic', contactPhoto.editCard.newGenericPhotoHandler);

window.addEventListener('load', contactPhoto.editCard.checkDCPDefaultPrefs, false);