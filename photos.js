
function btnPhotosHtml() {

    gotoTab('Photos')
    // gotoPhotoManageTab('phm-nav-manage')
    gotoPhotoManageTab('phs-nav-select')

    

}

function gotoPhotoManageTab(tab) {

  gotoTab('Photos')
  $('#' + tab).addClass("active show");
  
}

async function loadSheetsToManage() {

  clearStatus("phs")

  var shts = await getSheets()

  console.log('shts', shts)

  var sheets = shts.result.sheets

  if (!sheets) return

  var openshtArr = []
  for (var j = 0; j < sheets.length; j++) {

    let shtTitle = sheets[j].properties.title
    openshtArr.push({ title: shtTitle, type: "all" })

  }

  var $tblSheets = $("#gddContainer > .d-none").eq(0)  // the 1st one is a template which is always d-none

  var x = $tblSheets.clone();
  $("#gddContainer").empty();
  x.appendTo("#gddContainer");

  
  var shts = await openShts(openshtArr)

  for (let s in shts) {

    var sht = shts[s]

    let shtTitle = s

   
    if (sht.rowCount == 0) continue

    var shtHdrs = sht.colHdrs
    var shtArr = sht.vals
    var statCol = shtHdrs.indexOf('Status')
    var msgIdsCol = shtHdrs.indexOf('Message Ids')

    if (statCol<0 || msgIdsCol<0) continue

    
    var msgIdsArr = shtArr.map(x => x[msgIdsCol]);
    var statArr = shtArr.map(x => x[statCol]);
  
    var nbrDeletes = statArr.filter(x => x !== "Deleted").length;

    if (nbrDeletes == 0) continue

    var ele = $tblSheets.clone();

    ele.find('#gddSheetName')[0].innerHTML = shtTitle
    ele.find('#gddNbrGmails')[0].innerHTML = nbrDeletes
    ele.find('#gddSheetDate')[0].innerHTML = ''
    
    ele.find('#btnGddDelete')[0].setAttribute("onclick", "deleteGmails('" + shtTitle + "')");

    ele.find('#btnGddRemoveSheet')[0].setAttribute("onclick", "removeSheet('" + shtTitle + "')");

    ele.find('#btnGddShowGmails')[0].setAttribute("onclick", "showGmails('" + shtTitle  + "')");

    ele.removeClass('d-none');

    ele.appendTo("#gddContainer");
      
  }

}


async function onDeleteClick() {

}

async function deleteGmails(shtTitle) {

  if (!shtTitle) return

  var objSht = await openShts(
    [
      { title: shtTitle, type: "all" }
    ])


  var shtHdrs = objSht[shtTitle].colHdrs
  var shtArr = objSht[shtTitle].vals
  var statCol = shtHdrs.indexOf('Status')
  var msgIdsCol = shtHdrs.indexOf('Message Ids')
  
  var msgIdsArr = shtArr.map(x => x[msgIdsCol]);
  var statArr = shtArr.map(x => x[statCol]);

  var nbrDeletes = statArr.filter(x => x !== "Deleted").length;

  var msg = "Ok to delete " + nbrDeletes + " email threads from your Gmail account ?"
  var response = await confirm(msg);
  if (!response) return

  postStatus("gds", "Deleting Gmail threads "+ nbrDeletes + " from " + shtTitle)

  modal(true)


  var batchSize = 50
  var pntr = msgIdsArr.length
  var delCntr = 0

  while (true) {

    var msgArr = []
    var cntr = 0

    for (let i = 0; i<batchSize;i++) {

      cntr++
      pntr--

      if (pntr < 0) {
        pntr = 0
        break;
      }

      if (msgIdsArr[pntr] && statArr[pntr] != 'Deleted') msgArr = msgArr.concat(JSON.parse(msgIdsArr[pntr]))

    }

    if (pntr == 0 && msgArr.length == 0) break;

    if (msgArr.length == 0) continue

    var response = await batchDeleteGmail({
      userId: 'me',
      resource: {
        "ids": msgArr
      }
    });

    if (response.status !=204 ) return

    delCntr += msgArr.length

    postStatus("gds", null, delCntr + " emails deleted.")

    var data =     [
      {
        range: "'" + shtTitle + "'!" + calcRngA1(pntr + 2, statCol + 1, cntr, 1),   
        values: new Array(cntr).fill(['Deleted'])
      }
    ]
  
    var resource = {
      valueInputOption: 'USER_ENTERED',
      data: data
    }
  
    var response = await batchUpdateSheet(resource)

  }

  var shtId = await getSheetId(shtTitle)
  var response = await deleteSheet(shtId)

  loadSheetsToManage()


  postStatus("gds", "Complete<br>", delCntr + " emails deleted.")
  
  modal(false)

}

async function removeSheet(shtTitle) {

  var msg = "Ok to remove permanently remove the '" + shtTitle + "' list ?"
  var response = await confirm(msg);
  if (!response) return

  var shtId = await getSheetId(shtTitle)
  var response = await deleteSheet(shtId)

  loadSheetsToManage()

}


async function onPhotosListClick() {

  clearStatus("gds")

  var mediaType_selected = $('#photos-mediaTypeFilter-select').val();
  var startDate_selected = $('#photos-start-date-select').val();
  var endDate_selected = $('#photos-end-date-select').val();
  var keywords_selected = $('#photos-keywords-select').val()
  
  
  var srchSpec = {mediaType:mediaType_selected, startDate:startDate_selected, endDate:endDate_selected, keywords:keywords_selected}

  var dateFilter = makeDateFilterObj(srchSpec.startDate, srchSpec.endDate)

  var search =    "start date: " + srchSpec.startDate +  
                  " end date: " + srchSpec.endDate +  
                  " media type: " + srchSpec.mediaType +
                  (srchSpec.keywords ? (" keywords: '" + srchSpec.keywords + "'").replace(/'/g,"") : '')

  let testShtId = await getSheetId(search)
  if (testShtId) await deleteSheet(testShtId)

  var createRsp = await createSheet()

  var shtId = createRsp.result.replies[0].addSheet.properties.sheetId
  var shtTitle = createRsp.result.replies[0].addSheet.properties.title

  await deleteSheetRow(1, shtTitle, 5000)

  var listMedia = []
  listMedia.push(["Id","Description","ProductUrl","BaseUrl","MimeType","Filename","CreationTime","Width","Height","Size"])
                  
  var startTime = new Date()
  var msgCntr = 0

  modal(true)

  var params = {
      "pageSize": 100,
      "pageToken": null,
      
      "filters": {
          "mediaTypeFilter": {
              "mediaTypes": [
                'ALL_MEDIA'
              ]
          },
          "dateFilter": {

          }
      }
  }


  // params.filters.mediaTypeFilter.mediaTypes = srchSpec.keywords
  params.filters.dateFilter = dateFilter
  console.log('params', params, srchSpec)

  var mediaArr = []

  do {

    let response = await searchPhotos(params)
    params.pageToken = response.result.nextPageToken
    console.log('response', response)
    let mediaItems = response.result.mediaItems

    if (!mediaItems || mediaItems.length == 0) {
      postStatus("gds", "Error", 'No photos match the criteria given: <br><br>' + search, 'text-danger')
      modal(false)
      return
    }
            
    postStatus("phs", "Selecting Gmails<br>" + search)
    
    for (var i=0; i<mediaItems.length; i++)    {

      let mediaItem = mediaItems[i]

      if (keywords_selected)  var select = applyFilter(mediaItem.description, keywords_selected)
      else                    var select = true

      if (!select) continue

      listMedia.push([
        mediaItem.id,
        mediaItem.description,
        mediaItem.productUrl,
        mediaItem.baseUrl,
        mediaItem.mimeType,
        mediaItem.filename,
        mediaItem.mediaMetadata.creationTime,
        mediaItem.mediaMetadata.width,
        mediaItem.mediaMetadata.height,
        Math.round(mediaItem.mediaMetadata.width * mediaItem.mediaMetadata.height / 2**20)

      ])

      console.log('progress', i, msgCntr,  parseInt(msgCntr * 1000*60 / (new Date() - startTime)))
      
      msgCntr ++
      postStatus("phs", null, msgCntr)

    }

    var responseAppend = await appendSheetRow(listMedia, shtTitle)

    listMedia = []

  } while (params.pageToken)

  console.log('run time', i, msgCntr,  parseInt((new Date() - startTime) / (1000*60)), parseInt((msgCntr * 1000*60) / (new Date() - startTime)))

  var msg = msgCntr + ' email threads selected<br>' + 
            Math.round((new Date() - startTime) / (1000*60)) + ' minutes<br>' + 
            Math.round((msgCntr * 1000*60) / (new Date() - startTime)) + ' emails per minute'

  postStatus("phs", "Complete<br>" + search, msg)

  var response = renameSheet(shtId, search)

  modal(false)

}

function applyFilter(description, keywords) {

  var kwArr = keywords.toLowerCase().split(' ')

  if (!description) return false

  var descr = description.toLowerCase()
  var select = false

  for (i=0;i<kwArr.length;i++) {

    if (descr.indexOf(' ' + kwArr[i] + (isNaN(kwArr[i][0]) ? ' ' : '')) > -1) {

      select = true
      break

    } 
  } 

  return select

}

async function testPatch() {

  var ids = "APKTQTbd-VEq33TA7mUkuFi3oMd5vIF8OAjXjO7W2uvcKUOSnoxhzfW0SPVGgk_boTslcV4dqqL8OBdSeSgzKwBX9oZiO6HaGA"
  // var mediaIds = ids.split()

//   // mediaIds.forEach(async id => {
//     var params = {
//       mediaItem:{
//         id:ids
//         // ,
//         // updateMask: {
//         //   "description": "mark" 
//         // }
      
//       // ,
//       // updateMask: JSON.stringify({
//       //   "description": "mark" 
//       // })
//     }
//     }
  
// console.log('params', params)

//     // var response = await gapi.client.photoslibrary.mediaItems.patch(params)

//     var requestBody = {
//       "description": "This is a new description"
//     };

//     var response = await gapi.client.photoslibrary.mediaItems.patch({
//       "resource": {
//         "mediaItem": {
//           "id": ids
//         },
//         "updateMask": Object.keys(requestBody).join(),
//         "body": requestBody
//       }
//     })

    var photoId = ids;
    var requestBody = {
      "description": "This is a new description"
    };
    patchPhoto(photoId, requestBody);

    console.log('patch response', response)

  // })




}

function patchPhoto(photoId, requestBody) {
  // Use the Google Photos API client library to make the request
  gapi.client.photoslibrary.mediaItems.patch({
    "resource": {
      "mediaItem": {
        "id": photoId
      },
      requestBody
    }
  }).then(function(response) {
    console.log(response);
  }, function(reason) {
    console.error('error: ' + reason.result.error.message);
  });
}

function makeDateFilterObj(strDt, endDt) {

    var dateFilter = 

        {
            "ranges": [
                {
                "startDate": {
                    "year": '',
                    "month": '',
                    "day": ''
                    },
                "endDate": {
                    "year": '',
                    "month": '',
                    "day": ''
                    }
                }
            ]
        }

    var dateRng = dateFilter.ranges[0].startDate

    if (strDt == '') {
        dateRng.year = 1900
        dateRng.month=1
        dateRng.day = 1
      } else {
        var dt = new Date(strDt.replace('-','/','g'));
        dateRng.year = dt.getFullYear()
        dateRng.month=dt.getMonth()*1+1
        dateRng.day = dt.getDate()
      }
     
    var dateRng = dateFilter.ranges[0].endDate

    if (endDt == '') {
        var dt = new Date();
        dateRng.year = dt.getFullYear()
        dateRng.month=dt.getMonth()*1+1
        dateRng.day = dt.getDate()*1+1
    } else {
        var dt = new Date(endDt.replace('-','/','g'));
        dateRng.year = dt.getFullYear()
        dateRng.month=dt.getMonth()*1+1
        dateRng.day = dt.getDate()
    }

    return dateFilter

}

async function uploadPhotos(photoFiles) {

  let accessToken = Goth.accessToken()

  console.log('accessToken', accessToken)

  const obj = {
    files: photoFiles.files,
    albumId: "AF1QipMNdgx8nBZvMbeKw3KAWAqk_ncilmFxyTsHKQE_v1IvHeMl_AqB02Blk2Jhwa0LHg", // Please set the album ID.
    accessToken: accessToken, // Please set your access token.
  };

  postData(obj).then((data) => {
  console.log(data); // JSON data parsed by `data.json()` call
});

  // upload(obj)
  //   .then((e) => console.log(e))
  //   .catch((err) => console.log(err));

}

async function postData(obj) {
  // Default options are marked with *

  const file = obj.files[0];
  const reader = new FileReader();
  reader.onloadend = function() {
    const base64Data = reader.result.split(',')[1]; // Extract the base64-encoded file data
  
    gapi.client.request({
      path: 'https://photoslibrary.googleapis.com/v1/uploads',
      method: 'POST',
      body: base64Data,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    }).then(function(response) {
      const uploadToken = response.result; // Obtain the upload token from the response
  
      const requestBody = {
        newMediaItems: [
          {
            description: 'Sample description',
            simpleMediaItem: {
              uploadToken: uploadToken,
            },
          },
        ],
      };
  
      gapi.client.request({
        path: 'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate',
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(function(response) {
        // Handle the response
        console.log(response);
      }).catch(function(error) {
        // Handle error
        console.error(error);
      });
    }).catch(function(error) {
      // Handle error
      console.error(error);
    });
  };
  
  reader.readAsDataURL(file);
  // const response = await fetch("https://photoslibrary.googleapis.com/v1/albums", {
  //   method: "GET", // *GET, POST, PUT, DELETE, etc.
  //   mode: "no-cors", // no-cors, *cors, same-origin
  //   cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
  //   credentials: "same-origin", // include, *same-origin, omit
  //   headers: {
  //           "Access-Control-Allow-Headers": "Content-Type,X-Goog-Upload-File-Name,X-Goog-Upload-Protocol,Authorization",
  //           "Content-Type": "application/octet-stream",
  //           "X-Goog-Upload-File-Name": obj.files[0].name,
  //           "X-Goog-Upload-Protocol": "raw",
  //           "Authorization": `Bearer ${obj.accessToken}`,
  //   },
  //   // body: obj.files[0], // body data type must match "Content-Type" header
  // })
  // console.log('response', response)

  // return response.json(); // parses JSON response into native JavaScript objects
}


function uploadxxxx({ files, albumId, accessToken }) {
  const description = 'test upload';
  const promises = Array.from(files).map((file) => {
    return new Promise((r) => {
      fetch("https://photoslibrary.googleapis.com/v1/uploads", {
        method: "POST", // POST, PUT, DELETE, etc.
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Goog-Upload-File-Name": file.name,
          "X-Goog-Upload-Protocol": "raw",
          "Authorization": `Bearer ${accessToken}`,
          // "Access-Control-Allow-Origin": "*",
          // "Access-Control-Allow-Headers": "Content-Type",
          

        },
        body: file, // string, FormData, Blob, BufferSource, or URLSearchParams
        // referrer: "", // or "" to send no Referer header,
        // or an url from the current origin
        // referrerPolicy: "no-referrer", // no-referrer-when-downgrade, no-referrer, origin, same-origin...
        mode: "no-cors"
      })
        .then(({ data }) => {
          console.log('r', r)
          r({
            description: description,
            simpleMediaItem: { fileName: file.name, uploadToken: data },
          });
        });
    });
  });
}

function upload({ files, albumId, accessToken }) {
  const description = 'test upload';
  const promises = Array.from(files).map((file) => {
    return new Promise((r) => {
      axios
        .post("https://photoslibrary.googleapis.com/v1/uploads", file, {
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Goog-Upload-File-Name": file.name,
            "X-Goog-Upload-Protocol": "raw",
            Authorization: `Bearer ${accessToken}`,
            "Access-Control-Allow-Origin": "https://photoslibrary.googleapis.com",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD"

          },

        })
        .then(({ data }) => {
          console.log('r', r)
          r({
            description: description,
            simpleMediaItem: { fileName: file.name, uploadToken: data },
          });
        });
    });
  });
  return Promise.all(promises).then((e) => {
    return new Promise((resolve, reject) => {
      console.log(e);
      axios
        .post(
          "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
          JSON.stringify({ albumId: albumId, newMediaItems: e }),
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "Access-Control-Allow-Origin": "https://photoslibrary.googleapis.com",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD"
              
            },

          }
        )
        .then(resolve)
        .catch(reject);
    });
  });
}