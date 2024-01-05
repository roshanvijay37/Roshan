function SendMail() {
  
    // Prepare template parameters
    var templateParams = {
        from_name : document.getElementById("fullName").value,
        email_id : document.getElementById("emailAddress").value,
        phone : document.getElementById("phoneNumber").value,
        message :document.getElementById("messageToRoshan").value
    }
  
    // Send email using EmailJS
    emailjs.send('service_7ft8ctb', 'template_9vdseo7', templateParams)
      .then(function(response) {
        console.log('Email sent successfully:', response);
      }, function(error) {
        console.log('Email failed to send:', error);
      });
  }
  