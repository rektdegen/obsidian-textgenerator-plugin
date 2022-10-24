import {App,addIcon, Notice, Plugin, PluginSettingTab, Setting, request, MarkdownView, Editor, parseFrontMatterAliases} from 'obsidian';
import {TextGeneratorSettings} from './types';
import TextGeneratorPlugin from './main';
import {IGNORE_IN_YMAL} from './constants';

export default class ReqFormatter {
    plugin: TextGeneratorPlugin;
    app: App;

	constructor(app: App, plugin: TextGeneratorPlugin) {
        this.app = app;
		this.plugin = plugin;
	}

    getMetaData(path:string="") {
        let activeFile;
        if (path==="") {
            activeFile = this.app.workspace.getActiveFile();
        } else 
        {
            activeFile ={path};
        }

        if (activeFile !== null) {
            const cache = this.app.metadataCache.getCache(activeFile.path);
            this.app.metadataCache.getCache(this.app.workspace.getActiveFile().path);
            console.log("metadata", {...cache,path:activeFile.path});
            return {...cache,path:activeFile.path};
         }
    
        return null
    }
    

    getMetaDataAsStr(frontmatter:any)
    {
        let cleanFrontMatter = "";
        for (const [key, value] of Object.entries(frontmatter)) {
            if (IGNORE_IN_YMAL.findIndex((e)=>e===key)!=-1) continue;
            console.log(key);
            if (Array.isArray(value)) {
                cleanFrontMatter += `${key} : `
                value.forEach(v => {
                    cleanFrontMatter += `${value}, `
                })
                cleanFrontMatter += `\n`
            } else {
                cleanFrontMatter += `${key} : ${value} \n`
            }
        }
        
        return cleanFrontMatter;
    }
    
    addContext(parameters: TextGeneratorSettings,prompt: string){
        const params={
           ...parameters,
           prompt	
       }
       return params;
   }
   
    prepareReqParameters(params: TextGeneratorSettings,insertMetadata: boolean,path:string="") {
       let bodyParams:any = {
           "prompt": params.prompt,
           "max_tokens": params.max_tokens,
           "temperature": params.temperature,
           "frequency_penalty": params.frequency_penalty,
       };
       
       
       let reqParams = {
           url: `https://api.openai.com/v1/engines/${params.engine}/completions`,
           method: 'POST',
           body:'',
           headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${params.api_key}`
           },
           extractResult: "requestResults?.choices[0].text"
       }
   
       if (insertMetadata) {
           const frontmatter = this.getMetaData(path)?.frontmatter;
           console.log({path,frontmatter});
           if (frontmatter == null) {
               new Notice("No valid Metadata (YAML front matter) found!");
           } else {
               if(frontmatter["bodyParams"] && frontmatter["config"]?.append?.bodyParams==false){
                   bodyParams = frontmatter["bodyParams"];
               } else if (frontmatter["bodyParams"]) {
                   bodyParams = {...bodyParams,...frontmatter["bodyParams"]}; 
               } 
               
               if (frontmatter["config"]?.context &&  frontmatter["config"]?.context !== "prompt") 
               {
                   bodyParams[frontmatter["config"].context]=	 params.prompt;
                   delete bodyParams.prompt;
               }
               
               reqParams.body=	JSON.stringify(bodyParams);
   
               if (frontmatter["config"]?.output) 
               {
                   reqParams.extractResult= frontmatter["config"]?.output
               }
   
               if(frontmatter["reqParams"] && frontmatter["config"]?.append?.reqParams==false){
                   reqParams = frontmatter["reqParams"];
               } else if (frontmatter["reqParams"]) {
                   reqParams= {...reqParams,...frontmatter["reqParams"]} 
               } 
           } 
       } else {
           reqParams.body=	JSON.stringify(bodyParams);
       }

       console.log({bodyParams,reqParams});
       return reqParams;
   }
}