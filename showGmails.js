
async function showGmails(shtTitle) {

    var objSht = await openShts(
        [
          { title: shtTitle, type: "all" }
        ])

    

    if (objSht[shtTitle].rowCount == 0) return

    var shtHdrs = objSht[shtTitle].colHdrs
    var shtArr = objSht[shtTitle].vals
    var subjectCol = shtHdrs.indexOf('Subject')
    var msgDateCol = shtHdrs.indexOf('Last Message Date')
    var labelsCol = shtHdrs.indexOf('Labels')

    if (subjectCol<0 || msgDateCol<0 || labelsCol<0) return

    var subjectArr = shtArr.map(x => x[subjectCol]);
    var msgDateArr = shtArr.map(x => x[msgDateCol]);

    // var nbrDeletes = statArr.filter(x => x !== "Deleted").length;

    $('#gdddSheetName').innerHTML = shtTitle
    $('#gdddNbrGmails').innerHTML = subjectArr.length

    var sht = []


    for (let i=0;i<subjectArr.length;i++) {

      sht.push([subjectArr[i], msgDateArr[i]])

    }
    
    var tbl = new Table();
    
    tbl
      .setHeader()
      .setTableHeaderClass()
      .setData(sht)
      .setTableClass('table table-borderless')
      .setTrClass('d-flex')
      .setTcClass(['text-start col h5 text-success', 'text-start col-4 h5', 'col-1'])
      .setTdClass('py-1 pb-0 border-0 align-bottom border-bottom')
      .build('#tblGmails');
  
    gotoTab('ShowGmails')
  
    // $('#shtContainer > div').eq(idx+1).trigger( "click" )
  
  } 