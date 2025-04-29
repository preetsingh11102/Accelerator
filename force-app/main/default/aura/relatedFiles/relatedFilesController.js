({
    doInit: function (component, event, helper) {
        let sortingCategory = component.get("v.sortingCategory");
        helper.getRecords(component);
        helper.getContentVersionCategoriesH(component);


        if(component.get("v.recordId").startsWith('a0z')){
            component.set("v.showGenerateDocumentButton", true);
        }
    },
    handleFileUploadEvent: function (component, event, helper) {
        console.log('comming');
        let sortingCategory = component.get("v.sortingCategory");
        helper.getRecords(component);
        helper.getContentVersionCategoriesH(component);
    },
    downloadLineItem: function (component, event, helper) {
        var index = event.getSource().get("v.value");
        window.open(index, '_blank');
    },
    downloadSelectedLineItem: function (component, event, helper) {
        var fileRecords = component.get('v.fileRecordList');
        var notifLibrary = component.find('notifLib');
        let count = 0;
        console.log('fileRecords-', fileRecords);
        var downloadURL = '/sfc/servlet.shepherd/version/download';
        fileRecords.forEach(function (file) {
            if (file.isSelected) {
                count++;
                downloadURL += '/' + file.Id;
            }
        });
        if (count > 0) {
            downloadURL += '?filename=abc.zip';
            window.open(downloadURL, '_blank');
        } else {
            notifLibrary.showToast({
                "variant": 'warning', // 'success', 'warning', 'error', or 'info'
                "header": "Warning!",
                "message": "Please select some files to download"
            });
        }
    },
    exportCSVFileList: function (component, event, helper) {
        var fileRecords = component.get('v.fileRecordList');
        var selectedRecords = [];
        let count = 0;
        fileRecords.forEach(function (file) {
            if (file.isSelected) {
                count++;
                selectedRecords.push(file);
            }
        });
        if (count > 0) {
            var csvContent = helper.convertArrayToCSV(selectedRecords);
            helper.downloadFile('data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent), 'documents_data.csv');
        } else {
            console.log('csvContent', fileRecords);
            var csvContent = helper.convertArrayToCSV(fileRecords);
            console.log('csvContent', csvContent);
            helper.downloadFile('data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent), 'documents_data.csv');
        }
    },
    downloadAllLineItem: function (component, event, helper) {
        var fileRecords = component.get('v.fileRecordList');
        var downloadURL = '/sfc/servlet.shepherd/version/download';
        fileRecords.forEach(function (file) {
            downloadURL += '/' + file.Id;
        });
        downloadURL += '?filename=abc.zip';
        window.open(downloadURL, '_blank');
    },
    previewLineItem: function (component, event, helper) {
        var index = event.getSource().get("v.value");
        console.log('Index Value:' + index);
        //window.open(index,'_blank');
        //var openPreview = $A.get('e.lightning:openFiles');
        //openPreview.fire({recordIds:[index]});

        var navService = component.find("navService");
        var pageReference = {
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview',
            },
            state: {
                recordIds: index,
                selectedRecordId: index
            }
        };
        navService.navigate(pageReference);
    },
    
    previewPDFLineItem: function (component, event, helper) {
        var index = event.getSource().get("v.value");
        let item;
        let fileRecordList = component.get("v.fileRecordList");
        fileRecordList.forEach(function(element){
            if(element.Id == index){
                item = element;
            }
        });
        var pdfFileViewer = component.find("pdfFileViewer");
        console.log('before');
        pdfFileViewer.openFileViewer(index, undefined, item.fileType.toLowerCase());
        console.log('after');
    },

    selectAll: function (component, event, helper) {
        var selectAllCheckbox = component.find('selectAllCheckbox');
        var checkboxes = component.find('checkbox');
        var isChecked = selectAllCheckbox.get('v.checked');
        checkboxes.forEach(function (checkbox) {
            checkbox.set('v.checked', isChecked);
        });
    },
    showEmailPopupScreen: function (component, event, handler) {
        var fileRecords = component.get('v.fileRecordList');
        var notifLibrary = component.find('notifLib');
        let count = 0;
        fileRecords.forEach(function (file) {
            if (file.isSelected) {
                count++;
            }
        });
        console.log('count', count);
        if (count > 0) {
            component.set("v.showSpinner", true);
            var action = component.get("c.getMatterStaffRepresentative");
            action.setParams({
                "recordId": component.get("v.recordId"),
            });

            action.setCallback(this, function (resp) {
                var state = resp.getState();
                if (component.isValid() && state === 'SUCCESS') {
                    component.set("v.showSpinner", false);
                    console.log('email popup=', resp.getReturnValue());
                    component.set("v.showEmailPopup", true);
                    component.set("v.toAddress", resp.getReturnValue().toAddress);
                    component.set("v.ccAddress", resp.getReturnValue().ccAddress);
                    component.set("v.subject", resp.getReturnValue().subject);
                    component.set("v.body", resp.getReturnValue().body);
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
            $A.enqueueAction(action);
            
        } else {
            notifLibrary.showToast({
                "variant": 'warning', // 'success', 'warning', 'error', or 'info'
                "header": "Warning!",
                "message": "Please select some files to send in email"
            });
        }
    },
    sendEmail: function (component, event, helper) {
        component.set("v.showSpinner", true);
        var attachmentIds = [];
        var fileRecords = component.get('v.fileRecordList');
        fileRecords.forEach(function (file) {
            if (file.isSelected) {
                attachmentIds.push(file.Id);
            }
        });

        var action = component.get("c.sendEmailWithAttachments");
        action.setParams({
            "parentid": component.get("v.recordId"),
            "toAddress": component.get("v.toAddress"),
            "ccAddress": component.get("v.ccAddress"),
            "subject": component.get("v.subject"),
            "body": component.get("v.body"),
            "attachmentIds": attachmentIds
        });
        action.setCallback(this, function (response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                component.set("v.showSpinner", false);
                component.set("v.showEmailPopup", false);
                component.set("v.toAddress", '');
                component.set("v.ccAddress", '');
                component.set("v.subject", '');
                component.set("v.body", '');

                component.find('notifLib').showToast({
                    "variant": "success",
                    "title": "Success",
                    "message": "Email sent successfully"
                });
                // Optionally, perform any additional actions after sending the email
            } else {
                component.set("v.showSpinner", false);
                component.find('notifLib').showToast({
                    "variant": "error",
                    "title": "Failed to send email",
                    "message": "Error : " + response.getError()[0].message
                });
                // Optionally, handle the error
            }
        });
        $A.enqueueAction(action);
    },

    closeCancelConfirmModal: function (component, event, handler) {
        component.set("v.showEmailPopup", false);
    },
    docTypeChangeHandler: function (component, event, handler) {
        component.set("v.isSaveDocTypeButtonDisable", false);
    },
    cancelHandler: function (component, event, helper) {
        let sortingCategory = component.get("v.sortingCategory");
        helper.getRecords(component);
    },
    handleDocTypeChange: function (component, event, helper) {
        component.set("v.showSpinner", true);
        var action = component.get("c.updateFile");
        action.setParams({
            "updatedFileList": component.get("v.fileRecordList"),
            "parentid": component.get("v.recordId")
        });
        action.setCallback(this, function (resp) {
            var state = resp.getState();
            //component.set('v.showSpinner',false);
            if (component.isValid() && state === 'SUCCESS') {
                component.set("v.showSpinner", false);
                component.set("v.fileRecordList", resp.getReturnValue());
                component.find('notifLib').showToast({
                    "variant": "success",
                    "title": "Success",
                    "message": "Document Category Updated Successfully"
                });
                let sortingCategory = component.get("v.sortingCategory");
                helper.getRecords(component);
            } else {
                //console.log(resp.getError());
            }
        });

        $A.enqueueAction(action);
        component.set("v.isSaveDocTypeButtonDisable", true);
    },
    deleteFile: function (component, event, helper) {
        var notifLibrary = component.find('notifLib');
        var fileId = event.getSource().get("v.value");

        console.log('fileId', fileId);
        var count = 0;
        var fileRecords = component.get("v.fileRecordList");
        fileRecords.forEach(function (file) {
            console.log('file.Id', file.Id);
            if (file.Id == fileId) {
                file.isSelected = false;
            }
            if (file.isSelected) {
                count++;
            }
        });
        console.log('fileRecords=>', fileRecords);
        component.set("v.fileRecordList", fileRecords);

        if (count == 0) {
            component.set("v.showEmailPopup", false);
            notifLibrary.showToast({
                "variant": 'warning', // 'success', 'warning', 'error', or 'info'
                "header": "Warning!",
                "message": "Please select some files to send in email"
            });
        }


    },
    generateDocument: function (component, event, helper) {
        var navService = component.find("navService");
        var url = '/apex/loop__looplus?eid=' + component.get("v.recordId");
        var pageReference = {
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        };
        navService.navigate(pageReference);
    },
    navigateToDetailsTab: function (component, event, helper) {
        event.preventDefault();

        var navService = component.find("navService");
        var recordId = component.get("v.recordId");

        var pageReference = {
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'view'
            }
        };

        navService.navigate(pageReference);
    },
    deleteDocumentfile: function (component, event, helper) {
        helper.deleteFile(component, event);
    },
    uploadNewVersion: function (component, event, helper) {
        let item = event.getSource().get("v.value");
        helper.openNewFileVersionConfirm(component, item);

        /*this.LightningConfirm.open({
            message: 'You are about to replace this file with new file',
            theme: 'warning',
            label: 'Please Confirm',
        }).then(function(result) {
            // result is true if clicked "OK"
            // result is false if clicked "Cancel"
            if(result){
                component.set("v.selectedCurrentItem", item);
                component.find("fileId").getElement().click();
            }
        });*/

    },
    handleFilesChange: function (component, event, helper) {
        helper.uploadHelper(component, event);
    },
    shortingFiles: function (component, event, helper) {
        component.set("v.sortingCategory", true);
        component.set("v.sortingCategoryOrderBy", false);
        
        helper.getRecords(component);
    },
    shortingFilesOrderBy: function (component, event, helper) {
        let sortingCategoryOrderBy = component.get("v.sortingCategoryOrderBy");
        component.set("v.sortingCategory", false);
        component.set("v.sortingCategoryOrderBy", !sortingCategoryOrderBy);
        helper.getRecords(component);
    },
    handleDescriptionEdit: function (component, event, helper) {
        console.log('comming');
        let item = event.getSource().get("v.value");
        console.log(item);
        var fileRecords = component.get("v.fileRecordList");
        fileRecords.forEach(function (file) {
            if (file.Id == item.Id) {
                file.isEdit = true;
            }
        });
        component.set("v.fileRecordList", fileRecords);
        component.set("v.isSaveDocTypeButtonDisable", false);
    }

})