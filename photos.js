
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
                    " keywords: '" + srchSpec.keywords + "'"

    let testShtId = await getSheetId(search)
    if (testShtId) await deleteSheet(testShtId)

    var createRsp = await createSheet()

    var shtId = createRsp.result.replies[0].addSheet.properties.sheetId
    var shtTitle = createRsp.result.replies[0].addSheet.properties.title

    var clearRsp =  await deleteSheetRow(1, shtTitle, 5000)
   
    var listMedia = []
    listMedia.push(["Id","Description","ProductUrl","BaseUrl","MimeType","Filename","CreationTime","Width","Height","Size"])
                    
    var maxResults = 500
    var npt
    var startTime = new Date()
    var msgCntr = 0

    // modal(true)

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

// do {

//     let response = await searchPhotos(params)
//     params.pageToken = response.result.nextPageToken
//     console.log('response', response)
//     let mediaItems = response.result.mediaItems
//     mediaArr = mediaArr.concat(mediaItems)
//     console.log('pageToken', params.pageToken , response.result.pageToken)

// } while (params.pageToken)

// if (!mediaArr[0] || mediaArr.length == 0) {
//     toast('There are no photos for this Trip', 5000)
//     return }

//     console.log('mediaArr', mediaArr)

    


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

async function testPatch(ids) {

  
  var mediaIds = [ids]

  mediaIds.forEach(async id => {
    var params = {
      mediaItem:id,
      updateMask: {
        "description": "mark" 
      }
    }
  
    var response = await gapi.client.photoslibrary.mediaItems(params)

    console.log('patch response', response)

  })




}

function postStatus(idPreFix, status, text, textColor = 'text-black') {

  if (status) $("#" + idPreFix + "-status").html(status).addClass(textColor).removeClass('d-none')
  if (text)   $("#" + idPreFix + "-text").html(text).removeClass('d-none')

}

function clearStatus(idPreFix) {
  
  $("#" + idPreFix + "-status").html('').addClass('d-none')
  $("#" + idPreFix + "-text").html('').addClass('d-none')
  
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

