({
    doInit : function(component, event, helper) {
        helper.getContentVersionCategoriesH(component);
        
        var context = component.get("v.userContext");
        if(context){
            component.set("v.style","position: absolute; top: 27px;");
        }else{
            component.set("v.style","position: absolute; top: 37px;");
        }
        var action = component.get("c.getFileReference");
        action.setParams({
            "parentid":component.get("v.recordId"),
        });
        //component.set('v.showSpinner',true);
        action.setCallback(this,function(resp){
            var state = resp.getState();
            //component.set('v.showSpinner',false);
            if(component.isValid() && state === 'SUCCESS'){
                component.set("v.fileRecords",resp.getReturnValue());
                //component.find('mainCheck').set('v.checked',true);
                //helper.selectAllCheckBox(component,true,helper);
            }
        });
        
        $A.enqueueAction(action);
    },
    handleUploadFinished: function (cmp, event) {
        var uploadedFiles = event.getParam("files");
        uploadedFiles.forEach(file => console.log(file.name));
        const flset = [];
        uploadedFiles.forEach(file => flset.push(file.documentId));
        var action = cmp.get("c.uploadFileComplete");
        action.setParams({
            "conVerIdSet":flset,
            "documentType":cmp.get("v.documentType"),
            "parentid":cmp.get("v.recordId"),
             "privateCheckbox":cmp.get("v.privateCheckBoxValue")
        });
        
        action.setCallback(this,function(resp){
            var state = resp.getState();
            cmp.set("v.fileRecords",resp.getReturnValue());
            cmp.set("v.documentType","");
            cmp.set("v.isDisable", true);
            cmp.set("v.privateCheckBoxValue", false);
            $A.get("e.c:FileUploadComplete").fire();
        });
        
        $A.enqueueAction(action);
    },
    handleChange: function(component, event, helper) {
        //let fileName = component.get("v.fileName");
        let documentType = component.get("v.documentType");
        //if(fileName != 'No File Selected..' && (documentType != '' && documentType != null)){
        //   component.set("v.isDisable", false);
        //}
        if(documentType != '' && documentType != null){
            component.set("v.isDisable", false);
        }
        //helper.validateButton(component, event, helper);
    },
     deleteLineItem : function(component, event, helper){
        var index = event.getSource().get("v.value");
        component.set("v.deleteIndex", index);
        component.set("v.displayDeleteConfirmation", true);
    },
    downloadLineItem : function(component, event, helper){
        var index = event.getSource().get("v.value");
        window.open(index,'_blank');
    },
    downloadAllLineItem : function(component, event, helper){
        var fileRecords = component.get('v.fileRecords');
        var downloadURL = '/sfc/servlet.shepherd/version/download';
        fileRecords.forEach(function(file){
            downloadURL += '/' + file.Id;
        });
        downloadURL += '?filename=abc.zip';
        window.open(downloadURL,'_blank');
    },
    previewLineItem : function(component, event, helper){
        var index = event.getSource().get("v.value");
        console.log('Index Value:'+ index);
        //window.open(index,'_blank');
        //var openPreview = $A.get('e.lightning:openFiles');
        //openPreview.fire({recordIds:[index]});
        
        var navService = component.find("navService");
        var pageReference = {
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview',
            },
            state : {
                recordIds: index,
                selectedRecordId:index
            }
        };
        navService.navigate(pageReference);
    },
    
    confirmDeleteLineItem : function(component, event, helper){
        //var lineItems = component.get("v.fileRecords");
        var index = component.get("v.deleteIndex");
        //var item = lineItems[index];
        component.set('v.showSpinner',true);
        if(index != undefined){
            var action = component.get("c.deleteFileReference");
            action.setParams({
                "parentid":component.get("v.recordId"),
                "filerefernceid":index
            });
            
            action.setCallback(this,function(resp){
                var state = resp.getState();
                component.set('v.showSpinner',false);
                if(component.isValid() && state === 'SUCCESS'){
                    component.set("v.fileRecords",resp.getReturnValue());
                    component.find('notifLib').showToast({
                        "variant": "success",
                        "title": "Success",
                        "message": "File deleted successfully"
                    });
                } else {
                    //console.log(resp.getError());
                }
            });
            
            $A.enqueueAction(action);
        }
        
        component.set("v.displayDeleteConfirmation", false);
    },
    closeDeleteConfirmModal : function(component, event, helper){
        component.set("v.displayDeleteConfirmation", false);
    },
        closeCancelConfirmModal : function(component, event, helper){
        component.set("v.displayeditConfirmation", false);
    },
     editLineItem : function(component, event, helper){
         
        var index = event.getSource().get("v.value");
         console.log('Index Value editLineItem:'+ index);
        component.set("v.editIndex", index);
        component.set("v.displayeditConfirmation", true);
         //Getting type of Document
         var action = component.get("c.getFileType");
         action.setParams({
             "parentid":index
         });
         
         action.setCallback(this,function(resp){
             var state = resp.getState();
             console.log("Document type is:"+ resp.getReturnValue().Document_Type__c);
             component.set("v.lineItemdocumentType",resp.getReturnValue().Document_Type__c);
             component.set("v.docName",resp.getReturnValue().Title);
         });
         
         $A.enqueueAction(action);
    },
    confirmUpdateLineItem : function(component, event, helper){
        var index = component.get("v.editIndex");
        component.set('v.showSpinner',true);
        if(index != undefined){
            var action = component.get("c.UpdateFileReference");
            action.setParams({
                "parentid":component.get("v.recordId"),
                 "documenttype":component.get("v.lineItemdocumentType"),
                "docName": component.get("v.docName"),
                "filerefernceid":index
            });
            
            action.setCallback(this,function(resp){
                var state = resp.getState();
                component.set('v.showSpinner',false);
                if(component.isValid() && state === 'SUCCESS'){
                    component.set("v.fileRecords",resp.getReturnValue());
                    component.find('notifLib').showToast({
                        "variant": "success",
                        "title": "Success",
                        "message": "Document Type Updated Successfully"
                    });
                } else {
                    //console.log(resp.getError());
                }
            });
            
            $A.enqueueAction(action);
        }
        
        component.set("v.displayeditConfirmation", false);
    },
    docTypeChangeHandler: function(component,event,handler){
        component.set("v.isSaveDocTypeButtonDisable", false);
    },
     cancelHandler : function(component,event){
        //$A.get('e.force:refreshView').fire();
        $A.enqueueAction(component.get('c.doInit'));
    },
     handleDocTypeChange: function(component,event,helper){
        $A.util.removeClass(component.find("spinner"),"slds-hide");
        console.log('Event value:'+ event.getSource().get("v.value"));
        console.log('Target value:'+ JSON.stringify(component.get("v.fileRecords")));
        var action = component.get("c.updateFile");
        action.setParams({
            "updatedFileList" : component.get("v.fileRecords"),
            "parentid": component.get("v.recordId")
        });
        action.setCallback(this,function(resp){
            var state = resp.getState();
            //component.set('v.showSpinner',false);
            if(component.isValid() && state === 'SUCCESS'){
                $A.util.addClass(component.find("spinner"),"slds-hide");
                component.set("v.fileRecords",resp.getReturnValue());
                component.find('notifLib').showToast({
                    "variant": "success",
                    "title": "Success",
                    "message": "Document Type Updated Successfully"
                });
                //$A.get('e.force:refreshView').fire();
                //window.refresh();
                window.location.reload();
            } else {
                //console.log(resp.getError());
            }
        });
        
        $A.enqueueAction(action);
        component.set("v.isSaveDocTypeButtonDisable", true);
    },
    
    submitToMoneyThumb : function(component, evnet, helper){
        console.log('Test1');
        var moneythumbComponent = component.find('moneythumb').openPopup();
        console.log('Test2');
    },
     compressLineItem : function(component,event,helper){
        var index = event.getSource().get("v.value");
         console.log('Index value in compressLineItem==>'+ index);//added by vishal
        //return helper.uploadFileToCompress(component, index);
        
        
        var action = component.get("c.compressFile");
        action.setParams({
            "LinerecId" : index,
            "recId": component.get("v.recordId")
        });
        action.setCallback(this,function(resp){
            var state = resp.getState();
            //component.set('v.showSpinner',false);
            if(component.isValid() && state === 'SUCCESS'){
                $A.util.addClass(component.find("spinner"),"slds-hide");
                component.find('notifLib').showToast({
                    "variant": "success",
                    "title": "Success",
                    "message": "Document compression is in progress!"
                });
                
            } else {
                //console.log(resp.getError());
            }
        });
        
        $A.enqueueAction(action);
    },
    callUploadFileFlow: function (component, event, helper) {
        component.set("v.uploadFileModal", true);
        component.set("v.showSpinner", true);
        var flow = component.find("flowData");
        var recordId = component.get("v.recordId");
        var inputVariables = [
            {
                name : "recordId",
                type : "String",
                value : recordId
            }
        ];
        
        flow.startFlow("File_Upload_Files_Screen_Flow",inputVariables);
        
        

    },
    handleStatusChange : function(component, event, helper) {
        var status = event.getParam("status");
        console.log('Flow status:', status);
        if (status === "STARTED") {
            component.set("v.showSpinner", false);
        } else if (status === "FINISHED") {
            component.set("v.uploadFileModal", false);
            let sortBy = component.get("v.sortBy");
            let sortDirection = component.get("v.sortDirection");
            helper.getRecords(component, sortBy, sortDirection);
            var outputVariables = event.getParam("outputVariables");
            console.log('Flow finished. Output:', outputVariables);
        } else if (status === "ERROR") {
            component.set("v.showSpinner", false);
            component.set("v.uploadFileModal", false);
            var errorMessage = event.getParam("error");
            console.error('Flow error:', errorMessage);
        }
    },
})