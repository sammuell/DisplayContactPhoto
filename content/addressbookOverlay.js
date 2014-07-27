if (!contactPhoto) var contactPhoto = {};

contactPhoto.addressbook = {
  
  DCPDisplayHandler: function(aCard, aImg) {
    aImg.style.listStyleImage = ''; // clear the existing image
    
    var photoInfo = contactPhoto.photoForCard(aCard);
    
    photoInfo.size = contactPhoto.prefs.get('addressbook.size', 'int');
    photoInfo.photoObject = aImg;
    
    contactPhoto.display.logic(photoInfo);
    
    return true;
  },
  
  initCardDisplay: function() {
    var container = document.getElementById('cvbPhoto');
    container.setAttribute('context', 'DCP-Contextmenu'); // set the contextmenu
   
    var cvPhoto = document.getElementById('cvPhoto');

    // Display a larger photo in the address book.
    // Override unit of width (ch -> px).
    var width = contactPhoto.prefs.get('addressbook.size', 'int') + 'px';
    cvPhoto.style.maxWidth = width;
    cvPhoto.style.maxHeight = width;
    
    // open the edit card window when clicking on the photo
    cvPhoto.addEventListener('click', function(e) {
      if (e.button != 0) return; // do nothing if not left click
      
      window.contactPhoto.editCardFocusPhotoTab = true; // tell the dialog to focus the photo tab
      goDoCommand('button_edit'); // this opens the contact dialog
    }, false);
  },
}

window.addEventListener('load', contactPhoto.addressbook.initCardDisplay, false);

// override the default display handlers, can't use registerPhotoDisplayHandler()
// the add-on contains the logic deciding which photo to display
gPhotoDisplayHandlers['generic'] = contactPhoto.addressbook.DCPDisplayHandler;
gPhotoDisplayHandlers['file'] = contactPhoto.addressbook.DCPDisplayHandler;
gPhotoDisplayHandlers['web'] = contactPhoto.addressbook.DCPDisplayHandler;