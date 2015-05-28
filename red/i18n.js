/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 
var i18n = require("i18next");
var when = require("when");
var path = require("path");
var fs = require("fs");

var defaultLang = "en-US";

var resourceMap = {
    "runtime":  {
        basedir: path.resolve(__dirname+"/../locales"),
        file:"runtime.json"
    },
    "editor": {
        basedir: path.resolve(__dirname+"/../locales"),
        file: "editor.json"
    }
}
var resourceCache = {}

function registerMessageCatalog(namespace,dir,file) {
    return when.promise(function(resolve,reject) {
        resourceMap[namespace] = { basedir:dir, file:file};
        i18n.loadNamespace(namespace,function() {
            resolve();
        });
    });
}

var MessageFileLoader = {
    fetchOne: function(lng, ns, callback) {
        if (resourceMap[ns]) {
            var file = path.join(resourceMap[ns].basedir,lng,resourceMap[ns].file);
            //console.log(file);
            fs.readFile(file,"utf8",function(err,content) {
                if (err) {
                    callback(err);
                } else {
                    try {
                        //console.log(">>",ns,file,lng);
                        resourceCache[ns] = resourceCache[ns]||{};
                        resourceCache[ns][lng] = JSON.parse(content.replace(/^\uFEFF/, ''));
                        //console.log(resourceCache[ns][lng]);
                        callback(null, resourceCache[ns][lng]);
                    } catch(e) {
                        callback(e);
                    }
                }
            });
        } else {
            callback(new Error("Unrecognised namespace"));
        }
    }
    
}

function init() {
    return when.promise(function(resolve,reject) {
        i18n.backend(MessageFileLoader);
        i18n.init({
            ns: {
                namespaces: ["runtime","editor"],
                defaultNs: "runtime"
            },
            fallbackLng: ['en-US']
        },function() {
            resolve();
        });
    });
}

function getCatalog(namespace,lang) {
    //console.log("+",namespace,lang);
    //console.log(resourceCache[namespace][lang]);
    var result = null;
    if (resourceCache.hasOwnProperty(namespace)) {
        result = resourceCache[namespace][lang];
        if (!result) {
            var langParts = lang.split("-");
            if (langParts.length == 2) {
                result = getCatalog(namespace,langParts[0]);
            }
        }
    }
    //console.log(result);
    return result;
}

function determineLangFromHeaders(acceptedLanguages){
    var lang = "en-US";
    
    var supportedLanguages = ['en-US', 'es', 'fr', 'it', 'de', 'pt-BR', 'zh', 'zh-TW', 'ko', 'ja', 'zz-ZZ']; // TODO: pull this value from settings
    for (var i=0;i<acceptedLanguages.length;i++){
        if (supportedLanguages.indexOf(acceptedLanguages[i]) !== -1){
            lang = acceptedLanguages[i];
            break;
        // check the language without the country code
        } else if (supportedLanguages.indexOf(acceptedLanguages[i].split("-")[0]) !== -1) {
            lang = acceptedLanguages[i].split("-")[0];
            break;
        }
    }
    return lang;
}

var obj = module.exports = {
    init: init,
    registerMessageCatalog: registerMessageCatalog,
    catalog: getCatalog,
    i: i18n,
    determineLangFromHeaders: determineLangFromHeaders
}

obj['_'] = function() {
    //var opts = {};
    //if (def) {
    //    opts.defaultValue = def;
    //}
    //console.log(arguments);
    return i18n.t.apply(null,arguments);
}
