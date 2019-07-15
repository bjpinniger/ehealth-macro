const xapi = require('xapi');

const URL = 'http://ENTER_URL_HERE';

var MRN = '';
var webexnumbertodial = '';
var hostpin = '';
var isInWebexCall = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

xapi.event.on('CallDisconnect', (event) => {
	isInWebexCall = 0;
    });

function sendMonitoringUpdatePost(MRN_text, Doctor){
     xapi.command('HttpClient Post', { 'Header': 'Content-Type: application/json' , 'Url':URL, 'ResultBody': 'plaintext'}
     , JSON.stringify(Object.assign({'MRN': MRN_text}, {'Doctor': Doctor})))
     .then((response) => {
        console.debug(`received response with status code: ${response.StatusCode}`);
        let result = JSON.parse(response.Body);
        console.log(`message: ${result.message}`);
        if (response.StatusCode == 200) {
          webexnumbertodial = (result.message);
          console.log("Making the call now.");

          xapi.command("dial", {Number: webexnumbertodial}).catch((error) => { console.error(error); });
        }
        else {
        xapi.command("UserInterface Message Alert Display", {
              Title: 'Call rejected'
              , Text: 'Sorry, this call has been rejected. Please make sure you have the correct patient MRN.'
              , Duration: 10
          }).catch((error) => { console.error(error); });
        }
          
    })
    .catch((err) => {
        console.log(`failed with err message: ${err.message}`);
              }
    );
}

xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    if(event.PanelId == 'CallPatient'){
        xapi.command("UserInterface Message TextInput Display", {
                          Duration: 0
                        , FeedbackId: "callpatient_step1"
                        , InputType: "SingleLine"
                        , KeyboardState: "Open"
                        , Placeholder: "Patient MRN"
                        , SubmitText: "Next"
                        , Text: "Please enter the Patient Medical Record Number"
                        , Title: "Medical Record Number"
          }).catch((error) => { console.error(error); });
    }
});


xapi.event.on('UserInterface Message TextInput Response', (event) => {
    switch(event.FeedbackId){
        case 'callpatient_step1':
          MRN = event.Text;
          xapi.command("UserInterface Message TextInput Display", {
                          Duration: 0
                        , FeedbackId: "callpatient_step2"
                        , InputType: "SingleLine"
                        , KeyboardState: "Open"
                        , Placeholder: "Doctor's Name"
                        , SubmitText: "Next"
                        , Text: "Please enter the name of the Doctor"
                        , Title: "Name of Doctor"
          }).catch((error) => { console.error(error); });
          break;
        case 'callpatient_step2':
          sendMonitoringUpdatePost(MRN, event.Text);
          break;
    }
});

xapi.status.on('Call RemoteNumber', (remoteNumber) => {
  console.log(remoteNumber);
	if(remoteNumber.includes('webex.com')){
	    isInWebexCall = 1;
	    sleep(5000).then(() => {
		    if(isInWebexCall){ // need to check again in case call has dropped within the last 5 seconds
                if(hostpin.length>0){
                  xapi.command("Call DTMFSend", {DTMFString: hostpin});  
                    if(!hostpin.includes('#')){
                        xapi.command("Call DTMFSend", {DTMFString: '#'});
                    }
                } 
                else{
                    xapi.command("Call DTMFSend", {DTMFString: '#'});
                }
		    }		    
		});
	}
    });
