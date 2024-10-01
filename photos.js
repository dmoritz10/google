
function btnPhotosHtml() {

    gotoTab('Photos')
    // gotoPhotoManageTab('phm-nav-manage')
    gotoPhotoManageTab('phs-nav-select')

}

function gotoPhotoManageTab(tab) {

  gotoTab('Photos')
  $('#' + tab).addClass("active show");
  
}

async function onPhotosListClick() {

  clearStatus("gds")

  var mediaType_selected = $('#photos-mediaTypeFilter-select').val();
  var startDate_selected = $('#photos-start-date-select').val();
  var endDate_selected = $('#photos-end-date-select').val();
  var keywords_selected = $('#photos-keywords-select').val()
  var excludeNonAppData = $('#photos-exclude-non-app-data').is(":checked");
  
  
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
        'excludeNonAppCreatedData': excludeNonAppData,
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
    let mediaItems = response.result.mediaItems

    if (!mediaItems || mediaItems.length == 0) {
      console.log("gds", "Error", 'No photos match the criteria given: <br><br>' + search, 'text-danger')
      modal(false)
      break;
    }
            
    console.log("phs", "Selecting Photos " + keywords_selected)
    
    for (var i=0; i<mediaItems.length; i++)    {

      let mediaItem = mediaItems[i]

    // if (keywords_selected)  var select = applyFilter(mediaItem.description, keywords_selected)
    // else                    var select = true

    // if (!select) continue

    console.log('descr', mediaItem.description, keywords_selected, !keywords_selected, mediaItem.description != keywords_selected)

    if (mediaItem.description != keywords_selected && keywords_selected) continue


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

    }

    var responseAppend = await appendSheetRow(listMedia, shtTitle)

    listMedia = []

  } while (params.pageToken)

  console.log('run time', i, msgCntr,  parseInt((new Date() - startTime) / (1000*60)), parseInt((msgCntr * 1000*60) / (new Date() - startTime)))

  var msg = msgCntr + ' email threads selected<br>' + 
            Math.round((new Date() - startTime) / (1000*60)) + ' minutes<br>' + 
            Math.round((msgCntr * 1000*60) / (new Date() - startTime)) + ' emails per minute'

  console.log("phs", "Complete<br>" + search, msg)

  var response = renameSheet(shtId, search)

  modal(false)

}

async function selectMediaItemsAndAddToAlbum() {

  console.log('selectMediaItemsAndAddToAlbum')

  var albumEntered = $('#photos-album-Name').val()

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

  var params = {
    "pageSize": 100,
    "pageToken": null,
    
    "filters": {
      'excludeNonAppCreatedData': true,
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
    let mediaItems = response.result.mediaItems

    if (!mediaItems || mediaItems.length == 0) {
      console.log("gds", "Error", 'No photos match the criteria given: <br><br>' + search, 'text-danger')
      modal(false)
      break;
    }
            
    console.log("phs", "Selecting Photos " + keywords_selected)
    
    for (var i=0; i<mediaItems.length; i++)    {

      let mediaItem = mediaItems[i]

      // if (keywords_selected)  var select = applyFilter(mediaItem.description, keywords_selected)
      // else                    var select = true

      // if (!select) continue

      console.log('descr', mediaItem.description, keywords_selected, mediaItem.description != keywords_selected)

      if (mediaItem.description != keywords_selected) continue

      mediaArr.push([mediaItem.id])

      console.log('progress', i)
      
    }

  } while (params.pageToken)

  var albumId = await getAlbumId(albumEntered)

  console.log('albumId', albumId)
    
  var chunkMediaArr = chunkArray(mediaArr, 50)

  for (var i=0;i<chunkMediaArr.length;i++) {
    var response = await addMediaItemsToAlbums(albumId, chunkMediaArr[i])
  }

  console.log('selectMediaItemsAndAddToAlbum')

}

function chunkArray(array, chunkSize) {
  const result = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    result.push(chunk);
  }

  return result;
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

  var ids = ["APKTQTalkhqY61syEFoj2kUlzyjLYcQw1Gkj68k6usH_A_xvunzV_GyAx2rL-ZPqENztiIcm4gjOzBhk-UAaQorCF5bFEp02mQ"]
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

async function uploadPhotos_oneatatime(photoFiles) {

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
  
  let accessToken = Goth.accessToken()

  console.log('photoFiles.files', photoFiles.files)

  var cntr = 0
  var totNbr = 0
  var mediaItems = []

  for (var i=0;i<photoFiles.files.length;i++) {

    let file = photoFiles.files[i]

    const data = await readFile(file);

    let imageDescr = await buildDescr(data)
    console.log('imageDescr', imageDescr)

    const uParams = {
      file: {name: file.name, data:data},
      accessToken: accessToken 
    };

    var uploadResponse = await uploadPhoto(uParams)

    console.log('upload complete', i, 'of', photoFiles.files.length, file.name, Math.round(file.size / 1048576), 'mb', file)

    if (uploadResponse.status != 200) {
      console.log("uploadPhotos failed", uploadResponse);
      return
    }

    if (cntr > 49) {

      var createResponse = await createPhotos({'newMediaItems': mediaItems})
      cntr = 0
      mediaItems = []

    }

    cntr++
    totNbr++
    mediaItems.push(
        {
          description: imageDescr,
          simpleMediaItem: { fileName: file.name, uploadToken: uploadResponse.data } 
        })
    
  }

  if (cntr > 0) var createResponse = await createPhotos({'newMediaItems': mediaItems})

  console.log('uploadPhotos complete: ', totNbr )

}

async function uploadPhotos(photoFiles) {

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
  
  let accessToken = Goth.accessToken()

  console.log('photoFiles.files', photoFiles.files, typeof photoFiles.files)

  var cntr = 0
  var totNbr = 0
  var mediaItems = []

  var chunkPhotoFiles = chunkArray(photoFiles, 50)

  console.log('chunkPhotoFiles', chunkPhotoFiles)

  for (var i=0;i<chunkPhotoFiles.length;i++) {

    var uploadPromises = chunkPhotoFiles.map( file => {

      return new Promise((r) => {
        axios
          .post("https://photoslibrary.googleapis.com/v1/uploads", file, {
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Goog-Upload-File-Name": file.name,
              "X-Goog-Upload-Protocol": "raw",
              Authorization: `Bearer ${accessToken}`,
            },
          })
          .then(({ data }) => {
            r({
              description: 'hi dan',
              simpleMediaItem: { fileName: file.name, uploadToken: data },
            });
          });

      })
    })

    console.log('uploadPromises', uploadPromises)

    uploadPromises.Promise.all(uploadPhotoPromiseArr)
      .then( async (mediaItemsArr) => {

        var createResponse = await createPhotos({'newMediaItems': mediaItemsArr})
        cntr = 0
        mediaItems = []
        
      })

  }


    

}

async function uploadPhotos_promiseAll(photoFiles) {

  console.log('uploadPhotos')
  
  let accessToken = Goth.accessToken()

  console.log('photoFiles.files', photoFiles.files)
  const obj = {
    files: photoFiles.files,
    albumId: "", // Please set the album ID.
    accessToken: accessToken
  };
  uploadPhotos(obj)
    .then((e) => console.log(e))
    .catch((err) => console.log(err));


  console.log('uploadPhotos complete: ', 'put nbr here' )

}

async function buildDescr(data) {

/*
  Travel Companion / Trips

  Trip + ' ' + Month | 
  'Destination Detail find by Date, name | city | state |
  gps object


*/

let allMetaData = await EXIF.readFromBinaryFile(data);

return allMetaData.ImageDescription

}

async function addMediaItemsToAlbumsFromSheet () {

  console.log('addMediaItemsToAlbumsFromSheet')

  var mItemsArr = await getMediaItemsSheet("Move Media Items to Folder")
  var mItemsIds = mItemsArr.ids
  var mItemsAlbumNames = mItemsArr.albums

  var albumsArr = await getAllAlbums()
  var albumNames = albumsArr.albumNames
  var albumIds = albumsArr.ids

  console.log('mItemsArr', mItemsArr)
  console.log('albumsArr', albumsArr)
  console.log('albumNames', albumNames)
  console.log('albumIds', albumIds)


  // Create new Albums if necessary

  for (var i=0;i<mItemsIds.length;i++) {

    var mItemsAlbumName = mItemsAlbumNames[i]

    if (!mItemsAlbumName) continue

    var albumIdx = albumNames.indexOf(mItemsAlbumName)

    if (albumIdx == -1) {
      
      const response = await createAlbum(mItemsAlbumName)
      var aId = response.result.id
      albumIds.push(aId)
      albumNames.push(mItemsAlbumName)
    
    } 

  }
    
  // All media items to Albums

  var brkaName = 'init'
  var brkaId
  var mediaItemIds = []

  for (var i=0;i<mItemsIds.length;i++) {

    var mItemsAlbumName = mItemsAlbumNames[i]
    var mItemsId = mItemsIds[i]

    if (!mItemsAlbumName) continue

    var albumIdx = albumNames.indexOf(mItemsAlbumName)
    if (albumIdx == -1) continue

    var albumName = albumNames[albumIdx]
    var albumId = albumIds[albumIdx]

    if (brkaName == 'init') {
      brkaName = albumName
      brkaId = albumId
    }

    if (brkaName == mItemsAlbumName && mediaItemIds.length < 50) {
      mediaItemIds.push(mItemsId)
    } else {
      console.log('break', i, brkaName, mItemsAlbumName, mediaItemIds.length, albumId)

      // if (mediaItemIds.length > 0) var response = addMediaItemsToAlbums(albumId, mediaItemIds)
      var response = await addMediaItemsToAlbums(brkaId, mediaItemIds)
      brkaName = albumName
      brkaId = albumId
      mediaItemIds = [mItemsId]
    }
      
  }
 
  if (mediaItemIds.length > 0) {
    console.log('cleanup', i, brkaName, mItemsAlbumName, mediaItemIds.length, albumId)
    var response = await addMediaItemsToAlbums(albumId, mediaItemIds)
  }

  console.log('addMediaItemsToAlbums complete')

}

async function getMediaItemsSheet(shtName) {

  var objSht = await openShts(
    [
      { title: shtName, type: "all" }
    ])

if (objSht[shtName].rowCount == 0) return {'status': 'No data found on "Move to Album" sheet'}

var shtHdrs = objSht[shtName].colHdrs
var shtArr = objSht[shtName].vals
var idCol = shtHdrs.indexOf('Id')
var albumCol = shtHdrs.indexOf('Move to Album')

if (idCol<0 || albumCol<0 ) return {'status': 'Either "Id" or "Move to Album" column missing'}

var ids = shtArr.map(x => x[idCol]);
var albums = shtArr.map(x => x[albumCol]);

  return {
    'ids': ids,
    'albums': albums,
    'status': 'ok'
  }

}

async function getAllAlbums() {

  var response = await listAlbums()

  if (!response.result.albums) return {
    'ids': [],
    'albumNames': []
  }

  const ids = response.result.albums.map(album => album.id); 
  const titles = response.result.albums.map(album => album.title); 

  return {
    'ids': ids,
    'albumNames': titles
  }

}

async function getAlbumId(albumEntered) {

  var albums = await getAllAlbums()

  console.log('albums', albums)

  var albumIdx = albums.albumNames.indexOf(albumEntered)

  if (albumIdx == -1) {
    
    const response = await createAlbum(albumEntered)
    var rtn = response.result.id
  
  } else {

    var rtn = albums.ids[albumIdx]
  }

  return rtn

}
