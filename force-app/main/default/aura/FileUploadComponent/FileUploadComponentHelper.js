({
	getContentVersionCategoriesH: function(component) {
        var action = component.get("c.getContentVersionCategories");    
        action.setParams({
            "recordId":component.get("v.recordId")
        }); 
        action.setCallback(this,function(resp){
            var state = resp.getState();
            if(state === 'SUCCESS'){
                console.log('chekcing-', resp.getReturnValue());
                component.set("v.contentVersionCategories",resp.getReturnValue().categories);
                if(resp.getReturnValue().recordTypeName != undefined && resp.getReturnValue().recordTypeName == 'Legal_Adjudicatory'){
                    component.set("v.showPrivateCheckBox",true);
                }
            }
        });
        $A.enqueueAction(action);
    },
})