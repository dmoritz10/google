

const API_KEY   = 'AIzaSyCqyn9nW8Uo15autmsv6qGfpVenoZ9lRUY'  
const CLI_ID    = '922727887494-n8kcnouuajm7f9es4t4l52crt0rjni7b.apps.googleusercontent.com'  
const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets https://mail.google.com https://www.googleapis.com/auth/drive'; // Space delimited if more than one
const DISCOVERY = ['https://sheets.googleapis.com/$discovery/rest?version=v4',
                   'https://gmail.googleapis.com/$discovery/rest?version=v1', 
                   'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
                  ];
const SS        = 'Gmail Companion'

/**
 * The google libraries are loaded, and ready for action!
 */
function proceedAsLoaded() {
  if (Goth.recognize()) {
    Goth.onetap();
  } else {
    gotoTab('Auth')
    forceSignin();
  }
}

/**
 * They have to correctly get through the button click / sign up flow to proceed.
 */
function forceSignin() {
  Goth.button('signin', {type: 'standard', size: 'large', text: 'signup_with'});
}

function signoutEvent() {
  document.getElementById('signin').style.display = 'block';
  gotoTab('Auth')
  forceSignin();
}

function revokeEvent() {
  document.getElementById('signin').style.display = 'block';
  Goth.revoke()
  gotoTab('Auth')
  forceSignin();
}

function proceedAsSignedIn() {

  document.getElementById('signin').style.display = 'none';
  runApp();
}

/**
 * Handle the lifecycle of authenticated status
 */
function gothWatch(event) {
  switch (event) {
    case 'signin':
      proceedAsSignedIn();
      break;
    case 'revoke':
    case 'signout': 
      signoutEvent();
      break;
    case 'loaded':
      proceedAsLoaded();
      break;
    case 'onetap_suppressed':
      forceSignin();  // If a user bypasses onetap flows, we land them with a button.
      break;
    default: 
      console.log("Well, this is a surprise!");
      console.log(event);
  }
}

/**
 * Wire up the main ux machinery.
 */
function authorize() {
  Goth.observe(gothWatch);
  Goth.load(CLI_ID, API_KEY, SCOPES, DISCOVERY);
}

async function runApp() {

  user = Goth.user()

  var rtn = await getSSId(SS);

  if (rtn.fileId) {spreadsheetId = rtn.fileId}
  else {
    await confirm('getSSId error: ' + rtn.msg);
    window.close()
  }
  await initialUI();

  gotoTab('Home')
    
}

async function initialUI() {
  timerStart = new Date()

    arrShts = await openShts(
      [
        { title: 'Settings', type: "all" }
      ])
    

  console.log('initialUI', arrShts)

  arrOptions    = toObject(arrShts.Settings.vals)
  optionsIdx    = toObjectIdx(arrShts.Settings.vals)

};
