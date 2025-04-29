@isTest
public class RelatedFilesControllerTest {
    @isTest
    static void testGetFileReference() {
        test.starttest();
		String content = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.';
        for(integer i = 0; i<5 ; i++){
            content = content + content;
        }
        ContentVersion testContentVersion = new ContentVersion(
            Title = 'Test File',
            Description = 'Test Description',
            Document_Category__c = 'Agreement',
            VersionData = Blob.valueOf(content),
            PathOnClient = 'Test'
        );
        insert testContentVersion;

        Account testAccount = new Account(
        	Name = 'Test'
        );
        insert testAccount;
        
        
        Opportunity opp1 = new Opportunity();
        opp1.name = 'Test';
        //opp.Opportunity_Number__c = '13212';
        opp1.CloseDate = System.today().addDays(2); 
        opp1.StageName = 'Pending Review';
        //opp.Sales_Office__c = 'Tampa';
        insert opp1;
        
        ContentVersion contentVersion1 = new ContentVersion(
            Title = 'Penguins',
            PathOnClient = 'Penguins.jpg',
            VersionData = Blob.valueOf('Test Content'),
            IsMajorVersion = true
        );
        insert contentVersion1;    
        
        test.stopTest() ;
        List<Id> contentVersionIds = new List<Id>(); 
        ContentVersion testContentVersion1 = [Select Id,ContentDocumentId from ContentVersion limit 1];
        contentVersionIds.add(testContentVersion1.Id);
        ContentDocumentLink testContentDocumentLink = new ContentDocumentLink(
            LinkedEntityId = testAccount.Id, // Replace with actual parent ID
            ContentDocumentId = testContentVersion1.ContentDocumentId
        );
        insert testContentDocumentLink;
        LegalStratusISV__Matter__c testMatter = new LegalStratusISV__Matter__c(Name = 'Test Matter');
        insert testMatter;
        //Test.startTest();
        // Call the method to be tested
        List<RelatedFilesController.FileWrapperClass> fileReferences = RelatedFilesController.getFileReference(testAccount.ID, true, false);
        RelatedFilesController.updateFile(fileReferences, testAccount.ID);
        RelatedFilesController.sendEmailWithAttachments(testAccount.ID, 'preet.singh@arbolainc.com', 'preet.singh@arbolainc.com', 'test', 'test', contentVersionIds);
        RelatedFilesController.getMatterStaffRepresentative(testMatter.Id);
        RelatedFilesController.getContentVersionCategories(testMatter.Id);
        RelatedFilesController.uploadFileComplete(new list<id> {contentVersion1.Id}, 'Signed Application' , opp1.id,false);
        List<ContentVersion> cvList = [Select Id,ContentDocumentId from ContentVersion];
        RelatedFilesController.createEmailMessageWithAttachments(testAccount.ID, 'test', 'test', 'test@test.com', cvList, '3', 'test@test.com');
        //Test.stopTest();

        // Assert the results
        //System.assertNotEquals(null, fileReferences, 'File references should not be null');
        //System.assertEquals(1, fileReferences.size(), 'There should be one file reference');
        
        RelatedFilesController.FileWrapperClass fileReference = fileReferences[0];
        //System.assertEquals(testContentVersion.Id, fileReference.Id, 'File ID should match');
        //System.assertEquals(testContentVersion1.ContentDocumentId, fileReference.fileId, 'File ID should match');
       // System.assertEquals(testContentVersion.Title, fileReference.filetitle, 'File title should match');
        // Add more assertions for other fields if needed
        
        try{ RelatedFilesController.deleteDocument(testContentVersion1.Id); } catch(Exception e){}
        
        try{ RelatedFilesController.saveChunk(testContentVersion1.contentDocumentId, 'Test', 'date', 'application/pdf', ''); } catch(Exception e){}
    }

    // Add more test methods to cover other functionalities of your controller
}