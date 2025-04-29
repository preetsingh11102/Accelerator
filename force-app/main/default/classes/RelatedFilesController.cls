public with sharing class RelatedFilesController {
    
     @AuraEnabled
    public static list<FileWrapperClass> getFileReference (id parentid, boolean sortingCategory, boolean sortingCreatedDate) {
        list<FileWrapperClass> filelistwr = new list<FileWrapperClass>(); 
        List<ContentVersion> cvList = new List<ContentVersion>();
        Integer count = 1;
        if(sortingCategory==null){
            sortingCategory=false;
        }
        if(sortingCreatedDate==null){
            sortingCreatedDate=false;
        }
        Map<id,User> usermap = new Map<id,User>();
        if(Schema.sObjectType.User.isAccessible()){
            usermap = new Map<id,User>([Select id,Name,SmallPhotoUrl from user where isActive = true]);    
        }
        Id currentUserId = UserInfo.getUserId();
        Boolean showPrivateFiles = false;
        List<GroupMember> groupList = new List<GroupMember>(); 
        Group groupRecord = new Group();
        if(Schema.sObjectType.Group.isAccessible()){
            groupRecord = [SELECT Id, DeveloperName FROM Group WHERE DeveloperName = 'Legal_Staff' LIMIT 1];
        }
        if(groupRecord != null) {
            if(Schema.sObjectType.GroupMember.isAccessible()){
                groupList = [SELECT Id, GroupId, UserOrGroupId FROM GroupMember WHERE GroupId = :groupRecord.Id AND UserOrGroupId = :currentUserId];
            }
            if(groupList.size() > 0){
                showPrivateFiles = true;
            }
        }
        List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
        if(Schema.sObjectType.ContentDocumentLink.isAccessible()){
            cdlList = [SELECT Id, LinkedEntityId, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :parentid];      
        }                        
        Set<Id> documentIds = new Set<Id>(); 
        for(ContentDocumentLink cdl:cdlList){  
            documentIds.add(cdl.ContentDocumentId);  
        }
        Map<Id, Integer> countMap = new Map<Id, Integer>();
        String query = 'SELECT Id  FROM ContentVersion WHERE ContentDocumentId IN : documentIds AND IsLatest = true  ';
        if(!showPrivateFiles){
            query += ' AND Private__c = false';
        }
        query += ' Order by File_Date__c ASC'; 
        if(Schema.sObjectType.ContentVersion.isAccessible()){
            cvList = Database.query(query);
        }
        if(!cvList.isEmpty()){
            for(ContentVersion cv:cvList){
                countMap.put(cv.Id, count++);
            }
        }  

        query = 'SELECT Id, Title, ContentDocumentId,Document_Category__c, Description, CreatedById,CreatedDate,ContentSize, FileType,Uploaded_Date__c FROM ContentVersion WHERE ContentDocumentId IN : documentIds AND IsLatest = true ';
        if(!showPrivateFiles){
            query += ' AND Private__c = false';
        }
        if(sortingCategory){
            query += ' Order by Document_Category__c ASC';
            if(Schema.sObjectType.ContentVersion.isAccessible()){
                cvList = Database.query(query);
            }
            // cvList = [SELECT Id, Title, ContentDocumentId,Document_Category__c, Description, CreatedById,CreatedDate,ContentSize, FileType FROM ContentVersion WHERE ContentDocumentId IN : documentIds AND IsLatest = true  Order by Document_Category__c ASC];
        } else if ( sortingCreatedDate ) {
            query += '  Order by File_Date__c ASC';
            if(Schema.sObjectType.ContentVersion.isAccessible()){
                cvList = Database.query(query);
            }
            // cvList = [SELECT Id, Title, ContentDocumentId,Document_Category__c, Description, CreatedById,CreatedDate,ContentSize, FileType FROM ContentVersion WHERE ContentDocumentId IN : documentIds AND IsLatest = true  Order by CreatedDate ASC];
        } else {
            query += '  Order by File_Date__c ASC';
            if(Schema.sObjectType.ContentVersion.isAccessible()){
                cvList = Database.query(query);
            }
            // cvList = [SELECT Id, Title, ContentDocumentId,Document_Category__c, Description, CreatedById,CreatedDate,ContentSize, FileType FROM ContentVersion WHERE ContentDocumentId IN : documentIds AND IsLatest = true  Order by CreatedDate DESC];
        }


        if(!cvList.isEmpty()){
            for(ContentVersion cv:cvList){
                FileWrapperClass returnwrapperClass = new  FileWrapperClass ();
                returnwrapperClass.Id        = cv.Id; 
                returnwrapperClass.fileId          = cv.ContentDocumentId;
                returnwrapperClass.filetitle          = cv.Title;
                if(usermap.containskey(cv.CreatedById)){
                    returnwrapperClass.createdByName = usermap.get(cv.CreatedById).Name;
                }else{                    
                    returnwrapperClass.createdByName = '';
                }
                returnwrapperClass.category   = cv.Document_Category__c;
                returnwrapperClass.description   = cv.Description;
                returnwrapperClass.download   = '/sfc/servlet.shepherd/version/download/' + cv.Id;
                returnwrapperClass.preview   = cv.ContentDocumentId;
                DateTime dateTimeValue = cv.CreatedDate;
                if(cv.Uploaded_Date__c!=null){
                    Integer d = cv.Uploaded_Date__c.day();
                    Integer mo = cv.Uploaded_Date__c.month();
                    Integer yr = cv.Uploaded_Date__c.year();
                    dateTimeValue = DateTime.newInstance(yr, mo, d);
                }
                returnwrapperClass.createdDateTime   = dateTimeValue;
                returnwrapperClass.fileSize = FileSizeToString(cv.ContentSize);
                returnwrapperClass.fileType = cv.FileType;
                returnwrapperClass.order = countMap.get(cv.Id);
                filelistwr.add(returnwrapperClass);
            }
        }
        system.debug('*********cvList*****'+cvList);
        return filelistwr;
    }
    
    
    public static String FileSizeToString(Long Value)
    {
        /* string representation if a file's size, such as 2 KB, 4.1 MB, etc */
        if (Value < 1024){
            return string.valueOf(Value) + ' Bytes';
        } else if (Value >= 1024 && Value < (1024*1024)){
            //KB
            Decimal kb = Decimal.valueOf(Value);
            kb = kb.divide(1024,2);
            return string.valueOf(kb) + ' KB';
        } else if (Value >= (1024*1024) && Value < (1024*1024*1024)){
            //MB
            Decimal mb = Decimal.valueOf(Value);
            mb = mb.divide((1024*1024),2);
            return string.valueOf(mb) + ' MB';
        } else {
            //GB
            Decimal gb = Decimal.valueOf(Value);              
            gb = gb.divide((1024*1024*1024),2);
            return string.valueOf(gb) + ' GB';
        }    
    }
    @AuraEnabled   
    public static list<FileWrapperClass> updateFile( Object updatedFileList, string parentid ) {   
        
        try { 
            List<FileWrapperClass> filesForUpdate = (List<FileWrapperClass>) JSON.deserialize(JSON.serialize(updatedFileList),List<FileWrapperClass>.class);
            List<ContentVersion> attList = new List<ContentVersion>();
            set<id> idSet = new set<id>();
            for(FileWrapperClass wrp : filesForUpdate){
                idSet.add(wrp.Id);
            }
            Map<Id,ContentVersion> idAttachMap = new Map<Id,ContentVersion>();
            if(Schema.sObjectType.ContentVersion.isAccessible()){
                idAttachMap = new Map<Id,ContentVersion>([SELECT Id, ContentDocumentId,Document_Category__c FROM ContentVersion WHERE ContentDocumentId IN : idSet LIMIT 50000]);
            }
            
            for(FileWrapperClass wrp1 : filesForUpdate){
                ContentVersion att = new ContentVersion(id = wrp1.Id);
                att.Document_Category__c = wrp1.category;
                att.Description = wrp1.description;
                attList.add(att);
            }
            if(Schema.sObjectType.ContentVersion.isUpdateable() && attList.size()!=0){
                update attList;
            }
            return getFileReference(parentid, false, false); 
            
        } catch(Exception e) {
            return getFileReference(parentid, false, false);             
        } 
    } 
    @AuraEnabled
    public static void sendEmailWithAttachments(Id parentid, String toAddress, String ccAddress, String subject, String body, List<Id> attachmentIds) {
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(toAddress.split(';'));
        if (!String.isBlank(ccAddress)) {
            email.setCcAddresses(ccAddress.split(';'));
        }
        email.setSubject(subject);
        email.setPlainTextBody(body);
        
        List<Messaging.EmailFileAttachment> emailAttachments = new List<Messaging.EmailFileAttachment>();
        List<ContentVersion> cvListEmailMessage = new List<ContentVersion>(); 
        List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
        if(Schema.sObjectType.ContentDocumentLink.isAccessible()){
            cdlList = [SELECT Id, LinkedEntityId, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :parentid];      
        }
                               
        Set<Id> documentIds = new Set<Id>(); 
        for(ContentDocumentLink cdl:cdlList){  
            documentIds.add(cdl.ContentDocumentId);  
        }  
        List<ContentVersion> cvList = new List<ContentVersion>();
        if(Schema.sObjectType.ContentVersion.isAccessible()){
            cvList = [SELECT Id, Title, ContentDocumentId,Document_Category__c, Description, CreatedById,CreatedDate,ContentSize, FileType, VersionData FROM ContentVersion WHERE ContentDocumentId IN : documentIds AND IsLatest = true];    
        }
        
        if(!cvList.isEmpty()){
            for(ContentVersion cv:cvList){
                for (Id singleId : attachmentIds) {
                    if(singleId == cv.Id){
                        Messaging.EmailFileAttachment emailAttachment = new Messaging.EmailFileAttachment();
                        emailAttachment.setFileName(cv.Title);
                        emailAttachment.setBody(cv.VersionData);
                        emailAttachment.setContentType('application/pdf');
                        emailAttachments.add(emailAttachment);
                        cvListEmailMessage.add(cv);
                    }
                }
            }
        }
        
        email.setFileAttachments(emailAttachments);
        Messaging.SendEmailResult[] results = new List<Messaging.SendEmailResult>();
        if(!Test.isRunningTest()){
            results = Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
        }
        
        if (!Test.isRunningTest()){
            if (results[0].isSuccess()) {
                System.debug('Email sent successfully');
                RelatedFilesController.createEmailMessageWithAttachments(parentid, subject, body, toAddress, cvListEmailMessage, '3', ccAddress);
            } else {
                RelatedFilesController.createEmailMessageWithAttachments(parentid, subject, body, toAddress, cvListEmailMessage, '5', ccAddress);
                System.debug('Failed to send email: ' + results[0].getErrors()[0].getMessage());
            }    
        }
        
    }
    @AuraEnabled
    public static Object deleteDocument(Id documentId){
        try {
            ContentVersion versionToDelete = new ContentVersion();
            if(Schema.sObjectType.ContentVersion.isAccessible()){
                versionToDelete = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :documentId LIMIT 1];
            }
        if (versionToDelete != null) {
            Id contentDocumentId = versionToDelete.ContentDocumentId;            
            if (Schema.sObjectType.ContentDocument.isDeletable() && contentDocumentId != null) {
                delete new ContentDocument(Id = contentDocumentId);
            }
        }
        return null;
        } catch(Exception e) {
            throw new AuraHandledException('Error deleting ContentVersion: ' + e.getMessage());
        }
    }
    
    public class FileWrapperClass {
        @AuraEnabled public string Id {get;set;}
        @AuraEnabled public string fileId {get;set;}
        @AuraEnabled public string filetitle {get;set;}
        @AuraEnabled public string name{get;set;}
        @AuraEnabled public string category{get;set;}
        @AuraEnabled public string description{get;set;}
        @AuraEnabled public string fileSize{get;set;}
        @AuraEnabled public String createdByName {get;set;}
        @AuraEnabled public String download {get;set;}
        @AuraEnabled public String preview {get;set;}
        @AuraEnabled public String fileType {get;set;}
        @AuraEnabled public Datetime createdDateTime {get;set;}
        @AuraEnabled public Integer order {get;set;}
    }
    
    
    @AuraEnabled
    public static Id saveChunk(Id parentId, String fileName, String base64Data, String contentType, String fileId) {
        if (fileId == '') {
            fileId = saveTheFile(parentId, fileName, base64Data, contentType);
        } else {
            appendToFile(fileId, base64Data);
        }

        return Id.valueOf(fileId);
    }

    public static Id saveTheFile(Id parentId, String fileName, String base64Data, String contentType) {
        base64Data = EncodingUtil.urlDecode(base64Data, 'UTF-8');
        
        ContentVersion cv = new ContentVersion();
        cv.VersionData = EncodingUtil.base64Decode(base64Data);
        cv.Title = filename;
        cv.PathOnClient = filename;
        cv.ContentDocumentId = parentId;
        cv.ReasonForChange = 'Document replaced by user';
        cv.IsMajorVersion = true;
        if(Schema.sObjectType.ContentVersion.isCreateable()){
            insert cv;    
        }
        return cv.Id;
    }

    private static void appendToFile(Id fileId, String base64Data) {
        base64Data = EncodingUtil.urlDecode(base64Data, 'UTF-8');
        ContentVersion cv = new ContentVersion();
        if(Schema.sObjectType.ContentVersion.isAccessible()){
            cv = [
                SELECT Id, VersionData
                FROM ContentVersion
                WHERE Id =: fileId
            ];
        }

        String existingBody = EncodingUtil.base64Encode(cv.VersionData);

        cv.VersionData = EncodingUtil.base64Decode(existingBody + base64Data);
        if(Schema.sObjectType.ContentVersion.isUpdateable()){
            update cv;
        }
    }

    @AuraEnabled
    public static MatterWrapperClass getMatterStaffRepresentative (id recordId) {
        MatterWrapperClass matterEmailReturn = new MatterWrapperClass(); 
        List<LegalStratusISV__Matter__c> matter = new List<LegalStratusISV__Matter__c>();
        if(Schema.sObjectType.LegalStratusISV__Matter__c.isAccessible()){
            matter = [SELECT Name, LegalStratusISV__LS_Matter_Number__c FROM LegalStratusISV__Matter__c where Id = :recordId];    
        }
        
        String matterName = '';
        String matterNumber = '';
        if(!matter.isEmpty()){
            matterName = (String) matter[0].Name;
            matterNumber = (String)  matter[0].LegalStratusISV__LS_Matter_Number__c;
        }
        
        matterEmailReturn.subject = (matterNumber != null ? matterNumber+ ' - ' : '' )  + matterName;


        
        
        String emailAddresses = matterEmailReturn.toAddress;
        if(emailAddresses != null && emailAddresses.endsWith(';')) {
        emailAddresses = emailAddresses.substring(0, emailAddresses.length() - 1);
        }
        matterEmailReturn.toAddress = emailAddresses;
        
        

        emailAddresses = matterEmailReturn.ccAddress;
        if(emailAddresses != null && emailAddresses.endsWith(';')) {
        emailAddresses = emailAddresses.substring(0, emailAddresses.length() - 1);
        }
        matterEmailReturn.ccAddress = emailAddresses;

        matterEmailReturn.body = '';
        return matterEmailReturn;
    }

    public class MatterWrapperClass{
        @AuraEnabled public string subject {get;set;}
        @AuraEnabled public string toAddress {get;set;}
        @AuraEnabled public string ccAddress {get;set;}
        @AuraEnabled public string body{get;set;}
    }
	
    @testVisible
    private static void createEmailMessageWithAttachments(Id relatedToId, String subject, String textBody, String toAddress, List<ContentVersion> fileContents, String Status, String ccAddress) {
        try {
            String fromAddress = [SELECT Email FROM User WHERE Id = :UserInfo.getUserId()].Email;
            EmailMessage emailMessage = new EmailMessage();
            emailMessage.Subject = subject;
            emailMessage.TextBody = textBody;
            //emailMessage.HtmlBody = htmlBody;
            emailMessage.FromAddress = fromAddress;
            emailMessage.ToAddress = toAddress;
            emailMessage.Status = Status; // 0 indicates draft
            emailMessage.RelatedToId = relatedToId;
            emailMessage.CcAddress = ccAddress;
            //emailMessage.BccAddress = bccAddress;
            //emailMessage.OwnerId = ownerId;
            emailMessage.MessageDate = System.now();
            if(Schema.sObjectType.EmailMessage.isCreateable()){
                insert emailMessage;
            }
            
            // Link ContentVersions to EmailMessage
            List<ContentDocumentLink> contentDocumentLinks = new List<ContentDocumentLink>();
            for (ContentVersion cv : fileContents) {
                ContentDocumentLink contentDocumentLink = new ContentDocumentLink();
                contentDocumentLink.ContentDocumentId = cv.ContentDocumentId;
                contentDocumentLink.LinkedEntityId = emailMessage.Id;
                contentDocumentLink.ShareType = 'V'; // Viewer access
                contentDocumentLinks.add(contentDocumentLink);
            }
            if(Schema.sObjectType.ContentDocumentLink.isCreateable()){
                insert contentDocumentLinks;
            }
        } catch (Exception e) {
            System.debug('Error creating EmailMessage with attachment: ' + e.getMessage());
            throw new AuraHandledException('Error creating EmailMessage with attachment: ' + e.getMessage());
        }
    }
     @AuraEnabled
    public static CategoryWrapperClass getContentVersionCategories(Id recordId) {
        List<String> picklistValues = new List<String>();
        String recordTypeDeveloperName = '';
        try {
            String sObjName = recordId.getSObjectType().getDescribe().getName();
            String query = 'SELECT Id, RecordType.DeveloperName FROM '+(String) sObjName+' WHERE Id = :recordId LIMIT 1';
            List<Object> recordList = (List<Object>) Database.query(query);
            Map<String, Object> recordMap = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(recordList[0]));
            Map<String, Object> recordTypeMap = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(recordMap.get('RecordType')));
            recordTypeDeveloperName = (String) recordTypeMap.get('DeveloperName');
            String objectName = (String) sObjName;
            List<DocumentCategories__c> customMetadataList = new List<DocumentCategories__c>();
            if(Schema.sObjectType.DocumentCategories__c.isAccessible()){
                customMetadataList = [SELECT Id, Category_Name__c, Object_Name__c, Record_Type_Name__c FROM DocumentCategories__c where Object_Name__c = :objectName AND Record_Type_Name__c = :recordTypeDeveloperName Order by Category_Name__c ASC];
            }
            if(customMetadataList.size() > 0) {
                for(DocumentCategories__c category : customMetadataList) {
                    picklistValues.add(category.Category_Name__c);
                }
            }
        } catch (Exception e) {
            System.debug('Error fetching picklist values: ' + e.getMessage());
        }
        CategoryWrapperClass categoryWrapper = new CategoryWrapperClass();
        categoryWrapper.recordTypeName = recordTypeDeveloperName;
        categoryWrapper.categories = picklistValues;
        return categoryWrapper;
    }
    @AuraEnabled
   public static list<FileWrapperClass> uploadFileComplete(List<id> conVerIdSet, String documentType,id parentid, boolean privateCheckbox) {
        system.debug('*******conVerIdSet*********'+conVerIdSet);
        List<ContentDocumentLink> contentDocumentList = new List<ContentDocumentLink>();
        try{
            list<ContentVersion> versionlist =  new list<ContentVersion>();
            if(Schema.sObjectType.ContentVersion.isAccessible()){
                versionlist =  [SELECT Id,Title,Filetype,Document_Category__c, ContentDocumentId,FileExtension,ContentSize, Private__c FROM ContentVersion WHERE ContentDocumentId IN: conVerIdSet ];    
            }
            for(ContentVersion conVer :versionlist){
                system.debug('******Title******'+conVer.Title+'********Filetype******'+conVer.Filetype);
                conVer.Document_Category__c = documentType;
                conVer.Title = conVer.Title+'.'+conVer.FileExtension;
                conVer.Private__c = privateCheckbox;

               
            }
            if(Schema.sObjectType.ContentVersion.isUpdateable()){
                update versionlist;    
            }
           
        }catch(Exception ex){            throw new AuraHandledException(ex.getMessage());
        }
        return getFileReference(parentid, false, false); 
    }

     public class CategoryWrapperClass{
        @AuraEnabled public string recordTypeName {get;set;}
        @AuraEnabled public List<String> categories {get;set;}
    }
/*
    @AuraEnabled
    public static list<FileWrapperClass> UpdateFileReference (id parentid, string documenttype,id filerefernceid, string docName) {
        system.debug('*********parentid**************'+filerefernceid);
        ContentVersion conVer = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE ContentDocumentId =: filerefernceid];
         system.debug('*********documenttype**************'+documenttype);

        //conVer.Document_Type__c = documenttype;
        conVer.Title = docName;
        update conVer;
        return getFileReference(parentid, false); 
    }
      @AuraEnabled   
    public static list<FileWrapperClass> updateFile( Object updatedFileList, string parentid ) {   
        
        try { 
            List<wrapperClass> filesForUpdate = (List<wrapperClass>) JSON.deserialize(JSON.serialize(updatedFileList),List<wrapperClass>.class);
            List<ContentVersion> attList = new List<ContentVersion>();
            set<id> idSet = new set<id>();
            for(wrapperClass wrp : filesForUpdate){                idSet.add(wrp.Id);            }
            Map<Id,ContentVersion> idAttachMap = new Map<Id,ContentVersion>([SELECT Id, ContentDocumentId FROM ContentVersion WHERE ContentDocumentId IN : idSet LIMIT 50000]);
            for(wrapperClass wrp1 : filesForUpdate){                ContentVersion att = new ContentVersion(id = wrp1.Id);               attList.add(att);            }
            if(attList.size()!=0){                update attList;}
            return getFileReference(parentid, false);  
            
        } catch(Exception e) {                       return getFileReference(parentid, false);             
        } 
        
    }   
    

    @AuraEnabled
    public static void compressFile(string LinerecId, string recId){
        ContentVersion cv =  [SELECT Id,Title,Filetype, ContentDocumentId,FileExtension,VersionData FROM ContentVersion WHERE ContentDocumentId =: LinerecId ];
        //Attachment att = [Select Id, Body, Name, Description from Attachment where Id =: LinerecId LIMIT 1];
        //CompressFileAPIController.compressFile(cv.VersionData, cv.Title, cv.Document_Type__c, recId, LinerecId, true); ak need to check
       // createContentDistribution(LinerecId);
       // CompressFileAPIController.compressFileUpdated2(LinerecId);
    }

    @AuraEnabled
    public static list<wrapperClass> deleteFileReference (id parentid,id filerefernceid) {
        system.debug('*********parentid**************'+filerefernceid);
        list<ContentDocument> fileToDelete = new list<ContentDocument>();
        fileToDelete.add(new ContentDocument(Id = filerefernceid));
        if(!fileToDelete.isEmpty() && fileToDelete != null) {
            Database.delete(fileToDelete, false);
            Database.emptyRecycleBin(fileToDelete);
        }
        return getFileReference(parentid, false); 
    }
    @AuraEnabled
    public static ContentVersion getFileType(string parentid){
        return [SELECT Id, Description, Title FROM ContentVersion where ContentDocumentId =: parentid LIMIT 1];
    }
    public class wrapperClass{
        @AuraEnabled public string Id {get;set;}
        @AuraEnabled public string fileId {get;set;}
        @AuraEnabled public string filetitle {get;set;}
        @AuraEnabled public string Name{get;set;}
        @AuraEnabled public string DocumentType{get;set;}
        @AuraEnabled public string fileSize{get;set;}
        @AuraEnabled public String CreatedByName {get;set;}
        @AuraEnabled public String download {get;set;}
        @AuraEnabled public String preview {get;set;}
        @AuraEnabled public Datetime CreatedDateTime {get;set;}
    }
    
    public class FileWrapper {
        @AuraEnabled public string base64 {get;set;}
        @AuraEnabled public string filename {get;set;}
    }
    
    */
}