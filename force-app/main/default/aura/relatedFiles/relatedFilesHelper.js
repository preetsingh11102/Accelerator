({
    getRecords: function(component) {
        var action = component.get("c.getFileReference");
        action.setParams({
            "parentid":component.get("v.recordId"),
            "sortingCategory" : component.get("v.sortingCategory"),
            "sortingCreatedDate" : component.get("v.sortingCategoryOrderBy")
        });
        
        action.setCallback(this,function(resp){
            var state = resp.getState();
            if(component.isValid() && state === 'SUCCESS'){
                component.set("v.fileRecordList",resp.getReturnValue());
            }
        });
        $A.enqueueAction(action);
    },
    convertArrayToCSV: function(data) {
        var csvContent = '';
        var customHeader = [];
        var headers = Object.keys(data[0]);
        
        headers.forEach(function(singleHeading, index) {
            if(singleHeading == 'category'){
                singleHeading = 'Category';
            } else if(singleHeading == 'createdByName'){
                singleHeading = 'Created By';
            } else if(singleHeading == 'createdDateTime'){
                singleHeading = 'Created Date';
            } else if(singleHeading == 'fileSize'){
                singleHeading = 'File Size';
            } else if(singleHeading == 'filetitle'){
                singleHeading = 'File Name';
            }
            customHeader[index] = singleHeading;
        });
        console.log('headers', customHeader);
        csvContent += customHeader.join(',') + '\r\n';
        console.log('csvContent', csvContent);
        data.forEach(function(obj) {
            //console.log('obj', obj);
            var row = '';
            headers.forEach(function(header, index) {
                if (index > 0) {
                    row += ',';
                }
                /*if(header == 'download'){
                    continue;
                } else if(header == 'fileId'){
                    continue;
                } else if(header == 'Id'){
                    continue;
                } else if(header == 'preview'){
                    continue;
                }*/
                if(obj[header] != undefined){
                    row += '"'+obj[header]+'"';
                } else {
                    row += '';
                }
            });
            csvContent += row + '\r\n';
        });
        return csvContent;
    },
    
    downloadFile: function(content, fileName) {
        var element = document.createElement('a');
        element.setAttribute('href', content);
        element.setAttribute('download', fileName);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },
    
    MAX_FILE_SIZE: 4500000, //Max file size 4.5 MB 
    CHUNK_SIZE: 750000,      //Chunk Max size 750Kb 
    
    uploadHelper: function(component, event) {
        component.set("v.showSpinner", true);
        
        //var fileInput = component.find("fileId").get("v.files");
        var item = component.get("v.selectedCurrentItem");
        
        //console.log('fileInput',fileInput);
        var file = event.target.files[0] //fileInput[0];
        console.log('file',file);
        var self = this;
        
        if (file.size > self.MAX_FILE_SIZE) {
            component.set("v.showSpinner", false);
            component.find('notifLib').showToast({
                    "variant": 'error', // 'success', 'warning', 'error', or 'info'
                    "header": "Error!",
                    "message": 'Alert : File size cannot exceed ' + self.MAX_FILE_SIZE + ' bytes.\n' + ' Selected file size: ' + file.size
                });
            return;
        }
        
        
        var objFileReader = new FileReader();
        objFileReader.onload = $A.getCallback(function() {
            var fileContents = objFileReader.result;
            var base64 = 'base64,';
            var dataStart = fileContents.indexOf(base64) + base64.length;
            
            fileContents = fileContents.substring(dataStart);
            self.uploadProcess(component, file, fileContents, item);
        });
        
        objFileReader.readAsDataURL(file);
    },
    
    uploadProcess: function(component, file, fileContents, item) {
        var startPosition = 0;
        var endPosition = Math.min(fileContents.length, startPosition + this.CHUNK_SIZE);
        this.uploadInChunk(component, file, fileContents, startPosition, endPosition, item, '');
    },
    
    
    uploadInChunk: function(component, file, fileContents, startPosition, endPosition, item, attachId) {
        
        var getchunk = fileContents.substring(startPosition, endPosition);
        var action = component.get("c.saveChunk");
        action.setParams({
            parentId: item.fileId,
            fileName: file.name,
            base64Data: encodeURIComponent(getchunk),
            contentType: file.type,
            fileId: attachId
        });
        
        // set call back 
        action.setCallback(this, function(response) {
            // store the response / Attachment Id   
            attachId = response.getReturnValue();
            var state = response.getState();
            if (state === "SUCCESS") {
                // update the start position with end postion
                startPosition = endPosition;
                endPosition = Math.min(fileContents.length, startPosition + this.CHUNK_SIZE);
                // check if the start postion is still less then end postion 
                // then call again 'uploadInChunk' method , 
                // else, diaply alert msg and hide the loading spinner
                if (startPosition < endPosition) {
                    this.uploadInChunk(component, file, fileContents, startPosition, endPosition, attachId);
                } else {
                    component.set("v.showSpinner", false);
                    component.find('notifLib').showToast({
                        "variant": 'success', // 'success', 'warning', 'error', or 'info'
                        "header": "Success!",
                        "message": "file uploaded successfully"
                    });
                    let sortingCategory = component.get("v.sortingCategory");
                    this.getRecords(component, sortingCategory);
                }
                // handel the response errors        
            } else if (state === "INCOMPLETE") {
                component.set("v.showSpinner", false);
                component.find('notifLib').showToast({
                    "variant": 'error', // 'success', 'warning', 'error', or 'info'
                    "header": "Error!",
                    "message": "From server: " + response.getReturnValue()
                });
                
            } else if (state === "ERROR") {
                component.set("v.showSpinner", false);
                var errors = response.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        console.log("Error message: " + errors[0].message);
                    }
                } else {
                    console.log("Unknown error");
                }
            }
        });
        // enqueue the action
        $A.enqueueAction(action);
    },
    
    openNewFileVersionConfirm : function(component, item){
        this.LightningConfirm.open({
            message: 'You are about to replace this file with new file',
            //theme: 'warning',
            label: 'Please Confirm',
        }).then(function(result) {
            // result is true if clicked "OK"
            // result is false if clicked "Cancel"
            if(result){
                component.set("v.selectedCurrentItem", item);
        		component.find("fileId").getElement().click();
            }
        });
    },

    deleteFile: function(component, event) {
        this.LightningConfirm.open({
            message: 'Are you sure you want to delete this file?',
            theme: 'warning',
            label: 'Please Confirm',
        }).then(function(result) {
            if(result){
                component.set("v.showSpinner", true);
                var fileRecords = component.get('v.fileRecordList');
                var newFileRecords = [];
                console.log('fileRecords-', fileRecords);
                var index = event.getSource().get("v.value");
                console.log('Index Value:' + index);
        
                var action = component.get("c.deleteDocument");
                action.setParams({
                    documentId: event.getSource().get("v.value")
                });
                action.setCallback(this, function (response) {
                    var state = response.getState();
                    if (state === "SUCCESS") {
                        component.set("v.showSpinner", false);
                        fileRecords.forEach(function (file) {
                            if (file.Id != index) {
                                newFileRecords.push(file);
                            }
                        });
                        component.set('v.fileRecordList', newFileRecords);
                        component.find('notifLib').showToast({
                            "variant": "success",
                            "title": "Success",
                            "message": "File Deleted Successfully"
                        });
                        console.log("ContentVersion deleted successfully");
                        // Optionally, perform any additional logic here after deletion
                    } else if (state === "ERROR") {
                        var errors = response.getError();
                        if (errors) {
                            console.error("Error message: ", errors[0].message);
                        }
                    }
                });
                $A.enqueueAction(action);
            }
        });
    },
    getContentVersionCategoriesH: function(component) {
        var action = component.get("c.getContentVersionCategories");
        action.setParams({
            "recordId":component.get("v.recordId")
        });         
        action.setCallback(this,function(resp){
            var state = resp.getState();
            if(state === 'SUCCESS'){
                console.log('chekcing-contentVersionCategories-', resp.getReturnValue().categories);
                component.set("v.contentVersionCategories",resp.getReturnValue().categories);
            }
        });
        $A.enqueueAction(action);
    },


})