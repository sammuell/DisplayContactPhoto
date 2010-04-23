if (!contactPhoto) var contactPhoto = {};

contactPhoto.editCard = {
	displayGenericPhotos: function() {
		var genericPhotoList = document.getElementById('GenericPhotoList');
		var oldPhotoListValue = genericPhotoList.value;
		
		var menupopup = genericPhotoList.getElementsByTagName('menupopup')[0];
		
		// update existing entries to iconic style
		for (var i=0; i<menupopup.childNodes.length; i++) {
			menupopup.childNodes[i].className += ' menuitem-iconic';
		}

		var templateList = document.getElementById('DiCoP-GenericPhotoListTemplate');
		var templateMenupopup = templateList.firstChild;
		
		for (var i=0; i<templateMenupopup.childNodes.length; i++) {
			var clone = templateMenupopup.childNodes[i].cloneNode(true);
			menupopup.appendChild(clone);
		}
		
		genericPhotoList.value = oldPhotoListValue; // update the generated list
		
		// if gravatar is disabled, disable the menuitem
		if (contactPhoto.prefs.get('enableGravatar', 'bool') == false) {
			var menuitemGravatar = document.getElementById('DiCoP-GenericPhotoGravatar');

			if (menuitemGravatar.selected) {
				var menuitemDiCoP = document.getElementById('DiCoP-GenericPhotoDiCoP');
				menuitemDiCoP.parentNode.parentNode.value = menuitemDiCoP.value;
			}
			
			menuitemGravatar.disabled = true;
		}
	}
}

window.addEventListener('load', contactPhoto.editCard.displayGenericPhotos, false);
