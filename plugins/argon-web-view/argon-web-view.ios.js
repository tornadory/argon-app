"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Argon = require("@argonjs/argon");
var common = require("./argon-web-view-common");
var trace = require("trace");
var utils = require("utils/utils");
var dialogs = require("ui/dialogs");
var ARGON_USER_AGENT = UIWebView.alloc().init().stringByEvaluatingJavaScriptFromString('navigator.userAgent') + ' Argon/' + Argon.version;
var processPool = WKProcessPool.new();
/// In-memory certificate store.
// class CertStore {
//     private keys = new Set<string>();
//     public addCertificate(cert: any, origin:string) {
//         let data: NSData = SecCertificateCopyData(cert)
//         let key = this.keyForData(data, origin);
//         this.keys.add(key);
//     }
//     public containsCertificate(cert: any, origin:string) : boolean {
//         let data: NSData = SecCertificateCopyData(cert)
//         let key = this.keyForData(data, origin)
//         return this.keys.has(key);
//     }
//     private keyForData(data: NSData, origin:string) {
//         return `${origin}/${data.hash}`;
//     }
// }
// const _certStore = new CertStore();
var ArgonWebView = /** @class */ (function (_super) {
    __extends(ArgonWebView, _super);
    function ArgonWebView() {
        var _this = _super.call(this) || this;
        _this._argonPages = {};
        var configuration = WKWebViewConfiguration.alloc().init();
        configuration.allowsInlineMediaPlayback = true;
        configuration.allowsAirPlayForMediaPlayback = true;
        configuration.allowsPictureInPictureMediaPlayback = true;
        configuration.mediaTypesRequiringUserActionForPlayback = 0 /* None */;
        configuration.processPool = processPool;
        configuration.userContentController.addUserScript(WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly("(" + function () {
            var _originalLog = console.log;
            console.log = function () {
                webkit.messageHandlers.log.postMessage(JSON.stringify({ type: 'log', message: inspectEach(arguments) }));
                _originalLog.apply(console, arguments);
            };
            var _originalWarn = console.warn;
            console.warn = function () {
                webkit.messageHandlers.log.postMessage(JSON.stringify({ type: 'warn', message: inspectEach(arguments) }));
                _originalWarn.apply(console, arguments);
            };
            var _originalError = console.error;
            console.error = function () {
                webkit.messageHandlers.log.postMessage(JSON.stringify({ type: 'error', message: inspectEach(arguments) }));
                _originalError.apply(console, arguments);
            };
            window.addEventListener('error', function (e) {
                console.error('Unhandled Error: ' + e.message + ' (' + e.source + ':' + e.lineno + ')');
            }, false);
            function _sendArgonCheck(event) {
                if (document.head.querySelector('meta[name=argon]') !== null || typeof (Argon) !== 'undefined') {
                    if (event.persisted)
                        window.location.reload(false);
                    else
                        webkit.messageHandlers.argoncheck.postMessage("true");
                }
                else {
                    webkit.messageHandlers.argoncheck.postMessage("false");
                }
            }
            document.addEventListener("DOMContentLoaded", _sendArgonCheck);
            window.addEventListener("pageshow", _sendArgonCheck);
            function inspect(o, depth) {
                if (o === null)
                    return "null";
                if (o === undefined)
                    return "undefined";
                if (o instanceof Error)
                    return o.message + '\n' + o.stack;
                if (typeof o === 'number' || o instanceof Number)
                    return (o).toString();
                if (typeof o === 'string' || o instanceof String)
                    return o;
                if (Array.isArray(o))
                    return "Array[" + o.length + "]";
                if (o instanceof Date)
                    return o.toString();
                return depth > 0 ? className(o) + " {" + (Object.keys(o).map(function (key) {
                    return '\n    ' + key + ': ' + inspect(o, depth - 1);
                }).join() + Object.getPrototypeOf(o) ?
                    '\n    __proto__: ' + className(Object.getPrototypeOf(o)) : "") + "\n}" : className(o);
            }
            function inspectEach(args) {
                var argsArray = [].slice.call(args);
                return argsArray.map(function (arg) { return inspect(arg, 1); }).join(' ');
            }
            function className(o) {
                var name = Object.prototype.toString.call(o).slice(8, -1);
                if (name === 'Object')
                    name = o.constructor.name;
                return name;
            }
        }.toString() + "())", 0 /* AtDocumentStart */, true));
        // We want to replace the UIWebView created by superclass with WKWebView instance
        _this.nativeView = _this._ios = WKWebView.alloc().initWithFrameConfiguration(CGRectZero, configuration);
        delete _this._delegate; // remove reference to UIWebView delegate created by super class
        var delegate = _this._argonDelegate = ArgonWebViewDelegate.initWithOwner(new WeakRef(_this));
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argon");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "argoncheck");
        configuration.userContentController.addScriptMessageHandlerName(delegate, "log");
        _this._ios.allowsBackForwardNavigationGestures = true;
        _this._ios['customUserAgent'] = ARGON_USER_AGENT;
        // style appropriately
        _this._ios.scrollView.layer.masksToBounds = false;
        _this._ios.layer.masksToBounds = false;
        return _this;
    }
    ArgonWebView.prototype._setIsArgonPage = function (flag, url) {
        if (flag)
            this._argonPages[url] = true;
        if (!this.isArgonPage && flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.clearColor);
            this._ios.opaque = false;
            common.isArgonPageProperty.nativeValueChange(this, true);
            // this.set("isArgonPage", true);
        }
        else if (this.isArgonPage && !flag) {
            this._ios.scrollView.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.backgroundColor = utils.ios.getter(UIColor, UIColor.whiteColor);
            this._ios.opaque = true;
            // this.set("isArgonPage", false);
            common.isArgonPageProperty.nativeValueChange(this, false);
        }
    };
    ArgonWebView.prototype.evaluateJavascript = function (script) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._ios.evaluateJavaScriptCompletionHandler(script, function (result, error) {
                if (error)
                    reject(error.localizedDescription);
                else
                    resolve(result);
            });
        });
    };
    ArgonWebView.prototype.evaluateJavascriptWithoutPromise = function (script) {
        this._ios.evaluateJavaScriptCompletionHandler(script, null);
    };
    ArgonWebView.prototype.bringToFront = function () {
        this._ios.superview.bringSubviewToFront(this._ios);
    };
    ArgonWebView.prototype.onLoaded = function () {
        _super.prototype.onLoaded.call(this);
        this._ios.navigationDelegate = this._argonDelegate;
    };
    ArgonWebView.prototype.onUnloaded = function () {
        this._ios.navigationDelegate = undefined;
        _super.prototype.onUnloaded.call(this);
    };
    ArgonWebView.prototype.reload = function () {
        this._ios.reloadFromOrigin();
    };
    return ArgonWebView;
}(common.ArgonWebView));
exports.ArgonWebView = ArgonWebView;
var ArgonWebViewDelegate = /** @class */ (function (_super) {
    __extends(ArgonWebViewDelegate, _super);
    function ArgonWebViewDelegate() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ArgonWebViewDelegate.initWithOwner = function (owner) {
        var delegate = ArgonWebViewDelegate.new();
        delegate._owner = owner;
        var webview = owner.get().ios;
        webview.addObserverForKeyPathOptionsContext(delegate, "title", 0, null);
        webview.addObserverForKeyPathOptionsContext(delegate, "URL", 0, null);
        webview.addObserverForKeyPathOptionsContext(delegate, "estimatedProgress", 0, null);
        return delegate;
    };
    ArgonWebViewDelegate.prototype.dealloc = function () {
        var owner = this._owner.get();
        var webview = (owner && owner.ios);
        webview.removeObserverForKeyPath(this, "title");
        webview.removeObserverForKeyPath(this, "URL");
        webview.removeObserverForKeyPath(this, "estimatedProgress");
    };
    ArgonWebViewDelegate.prototype.observeValueForKeyPathOfObjectChangeContext = function (keyPath, object, change, context) {
        var owner = this._owner.get();
        if (!owner)
            return;
        var wkWebView = owner.ios;
        switch (keyPath) {
            case "title":
                common.titleProperty.nativeValueChange(owner, wkWebView.title);
                break;
            case "URL":
                common.urlProperty.nativeValueChange(owner, wkWebView.URL && wkWebView.URL.absoluteString);
                break;
            case "estimatedProgress":
                common.progressProperty.nativeValueChange(owner, wkWebView.estimatedProgress);
                break;
        }
    };
    // private updateURL() {
    //     const owner = this._owner.get();
    //     if (!owner) return;     
    //     const wkWebView = <WKWebView>owner.ios;
    //     owner.set("url", wkWebView.URL && wkWebView.URL.absoluteString);
    // }
    // WKScriptMessageHandler
    ArgonWebViewDelegate.prototype.userContentControllerDidReceiveScriptMessage = function (userContentController, message) {
        var owner = this._owner.get();
        if (!owner)
            return;
        var url = message.frameInfo.request.URL.absoluteString;
        if (message.name === 'argon') {
            if (!owner.session) {
                // just in case we thought below that the page was not an
                // argon page, perhaps because argon.js loaded asyncronously 
                // and the programmer didn't set up an argon meta tag
                owner._setIsArgonPage(true, url);
            }
            owner._handleArgonMessage(message.body);
        }
        else if (message.name === 'log') {
            owner._handleLogMessage(message.body);
        }
        else if (message.name === 'argoncheck') {
            if (!owner.session) {
                if (message.body === "true") {
                    owner._setIsArgonPage(true, url);
                }
                else {
                    owner._setIsArgonPage(false, url);
                }
            }
        }
    };
    ArgonWebViewDelegate.prototype.webViewDecidePolicyForNavigationActionDecisionHandler = function (webview, navigationAction, decisionHandler) {
        if (navigationAction.targetFrame && navigationAction.targetFrame.mainFrame) {
            var navigationType = navigationAction.navigationType;
            var navType = 'other';
            switch (navigationType) {
                case 0 /* LinkActivated */:
                    navType = 'linkClicked';
                    break;
                case 1 /* FormSubmitted */:
                    navType = 'formSubmitted';
                    break;
                case 2 /* BackForward */:
                    navType = 'backForward';
                    break;
                case 3 /* Reload */:
                    navType = 'reload';
                    break;
                case 4 /* FormResubmitted */:
                    navType = 'formResubmitted';
                    break;
            }
            var owner = this._owner.get();
            if (owner) {
                var url = navigationAction.request.URL.absoluteString;
                if (!owner._argonPages[url])
                    owner._setIsArgonPage(false, url);
                owner['_onLoadStarted'](url, navType);
            }
        }
        trace.write("ArgonWebView.webViewDecidePolicyForNavigationActionDecisionHandler(" + navigationAction.request.URL.absoluteString + ", " + navigationAction.navigationType + ")", trace.categories.Debug);
        decisionHandler(1 /* Allow */);
    };
    ArgonWebViewDelegate.prototype.webViewDecidePolicyForNavigationResponseDecisionHandler = function (webview, navigationResponse, decisionHandler) {
        decisionHandler(1 /* Allow */);
    };
    ArgonWebViewDelegate.prototype.webViewDidStartProvisionalNavigation = function (webView, navigation) {
        this._provisionalURL = webView.URL && webView.URL.absoluteString;
    };
    ArgonWebViewDelegate.prototype.webViewDidCommitNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (!owner)
            return;
        owner._didCommitNavigation();
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailProvisionalNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (!owner)
            return;
        owner['_onLoadFinished'](this._provisionalURL, "Provisional navigation failed");
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFinishNavigation = function (webView, navigation) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString);
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.webViewDidFailNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        // this.updateURL();
    };
    ArgonWebViewDelegate.prototype.checkIfWebContentProcessHasCrashed = function (webView, error) {
        if (error.code == 2 /* WebContentProcessTerminated */ && error.domain == "WebKitErrorDomain") {
            webView.reloadFromOrigin();
            return true;
        }
        return false;
    };
    ArgonWebViewDelegate.prototype.webViewDidFailProvisionalNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner)
            owner['_onLoadFinished'](webView.URL && webView.URL.absoluteString, error.localizedDescription);
        // this.updateURL();
        if (this.checkIfWebContentProcessHasCrashed(webView, error)) {
            return;
        }
        var url = error.userInfo.objectForKey(NSURLErrorFailingURLErrorKey);
        if (url && url.host &&
            error.code === NSURLErrorServerCertificateUntrusted ||
            error.code === NSURLErrorServerCertificateHasBadDate ||
            error.code === NSURLErrorServerCertificateHasUnknownRoot ||
            error.code === NSURLErrorServerCertificateNotYetValid) {
            // const certChain = error.userInfo.objectForKey('NSErrorPeerCertificateChainKey');
            // const cert = certChain && certChain[0];
            // dialogs.confirm(`${error.localizedDescription} Would you like to continue anyway?`).then(function (result) {
            //     if (result) {
            //         const origin = `${url.host}:${url.port||443}`;
            //         _certStore.addCertificate(cert, origin);
            //         webView.loadRequest(new NSURLRequest({URL:url}));
            //     }
            // }).catch(()=>{});
            dialogs.alert(error.localizedDescription + " A bug in Argon4 prevents us from continuing. Please use a site with a valid certificate.  We will fix this soon.");
        }
        else if (url && url.host &&
            error.code === NSURLErrorCannotFindHost ||
            error.code === NSURLErrorCannotConnectToHost) {
            dialogs.alert("Cannot connect to host. Please check the URL or the server connection.");
        }
        else if (url && url.host &&
            error.code === NSURLErrorTimedOut) {
            dialogs.alert("Host is not responding. Please check if the host suppots HTTPS.");
        }
    };
    // comment out until https://github.com/NativeScript/ios-runtime/issues/742 is fixed
    // webViewDidReceiveAuthenticationChallengeCompletionHandler(webView: WKWebView, challenge: NSURLAuthenticationChallenge, completionHandler: (p1: NSURLSessionAuthChallengeDisposition, p2?: NSURLCredential) => void): void {
    //     // If this is a certificate challenge, see if the certificate has previously been
    //     // accepted by the user.
    //     const origin = `${challenge.protectionSpace.host}:${challenge.protectionSpace.port}`;
    //     const trust = challenge.protectionSpace.serverTrust;
    //     const cert = SecTrustGetCertificateAtIndex(trust, 0);
    //     if (challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust &&
    //         trust && cert && _certStore.containsCertificate(cert, origin)) {
    //         completionHandler(NSURLSessionAuthChallengeDisposition.UseCredential, new NSURLCredential(trust))
    //         return;
    //     }
    //     completionHandler(NSURLSessionAuthChallengeDisposition.PerformDefaultHandling, undefined);
    // }
    ArgonWebViewDelegate.ObjCProtocols = [WKScriptMessageHandler, WKNavigationDelegate];
    return ArgonWebViewDelegate;
}(NSObject));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnb24td2ViLXZpZXcuaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJnb24td2ViLXZpZXcuaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQXdDO0FBQ3hDLGdEQUFrRDtBQUVsRCw2QkFBK0I7QUFDL0IsbUNBQXFDO0FBQ3JDLG9DQUFzQztBQUV0QyxJQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxzQ0FBc0MsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO0FBRTVJLElBQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUl4QyxnQ0FBZ0M7QUFDaEMsb0JBQW9CO0FBQ3BCLHdDQUF3QztBQUV4Qyx3REFBd0Q7QUFDeEQsMERBQTBEO0FBQzFELG1EQUFtRDtBQUNuRCw4QkFBOEI7QUFDOUIsUUFBUTtBQUVSLHVFQUF1RTtBQUN2RSwwREFBMEQ7QUFDMUQsa0RBQWtEO0FBQ2xELHFDQUFxQztBQUNyQyxRQUFRO0FBRVIsd0RBQXdEO0FBQ3hELDJDQUEyQztBQUMzQyxRQUFRO0FBQ1IsSUFBSTtBQUVKLHNDQUFzQztBQUV0QztJQUFrQyxnQ0FBbUI7SUFPakQ7UUFBQSxZQUNJLGlCQUFPLFNBZ0ZWO1FBRU0saUJBQVcsR0FBRyxFQUFFLENBQUM7UUFoRnBCLElBQU0sYUFBYSxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTVELGFBQWEsQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUM7UUFDL0MsYUFBYSxDQUFDLDZCQUE2QixHQUFHLElBQUksQ0FBQztRQUNuRCxhQUFhLENBQUMsbUNBQW1DLEdBQUcsSUFBSSxDQUFDO1FBQ3pELGFBQWEsQ0FBQyx3Q0FBd0MsZUFBK0IsQ0FBQztRQUN0RixhQUFhLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUN4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O1lBQ3ZDLEtBQUssQ0FBQyxJQUFJLEtBQUssNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0VBQXdFLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSTtZQUN0QixLQUFLLENBQUMsSUFBSSxLQUFLLGtCQUVmLENBQUMsQ0FBQyxDQUFDO1lBQ0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7SUFDTCxDQUFDO0lBRUQsb0ZBQW9GO0lBQ3ZGLDhOQUE4TjtJQUMzTix3RkFBd0Y7SUFDeEYsK0JBQStCO0lBQy9CLDRGQUE0RjtJQUM1RiwyREFBMkQ7SUFDM0QsNERBQTREO0lBQzVELG9HQUFvRztJQUNwRywyRUFBMkU7SUFDM0UsNEdBQTRHO0lBQzVHLGtCQUFrQjtJQUNsQixRQUFRO0lBRVIsaUdBQWlHO0lBQ2pHLElBQUk7SUFFVSxrQ0FBYSxHQUFHLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNqRiwyQkFBQztDQUFBLEFBdk5ELENBQW1DLFFBQVEsR0F1TjFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQXJnb24gZnJvbSAnQGFyZ29uanMvYXJnb24nO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vYXJnb24td2ViLXZpZXctY29tbW9uJztcbmltcG9ydCB7TmF2aWdhdGlvblR5cGV9IGZyb20gJ3VpL3dlYi12aWV3JztcbmltcG9ydCAqIGFzIHRyYWNlIGZyb20gJ3RyYWNlJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJ3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5cbmNvbnN0IEFSR09OX1VTRVJfQUdFTlQgPSBVSVdlYlZpZXcuYWxsb2MoKS5pbml0KCkuc3RyaW5nQnlFdmFsdWF0aW5nSmF2YVNjcmlwdEZyb21TdHJpbmcoJ25hdmlnYXRvci51c2VyQWdlbnQnKSArICcgQXJnb24vJyArIEFyZ29uLnZlcnNpb247XG5cbmNvbnN0IHByb2Nlc3NQb29sID0gV0tQcm9jZXNzUG9vbC5uZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuZGVjbGFyZSBjb25zdCB3aW5kb3c6YW55LCB3ZWJraXQ6YW55LCBkb2N1bWVudDphbnk7XG5cbi8vLyBJbi1tZW1vcnkgY2VydGlmaWNhdGUgc3RvcmUuXG4vLyBjbGFzcyBDZXJ0U3RvcmUge1xuLy8gICAgIHByaXZhdGUga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vLyAgICAgcHVibGljIGFkZENlcnRpZmljYXRlKGNlcnQ6IGFueSwgb3JpZ2luOnN0cmluZykge1xuLy8gICAgICAgICBsZXQgZGF0YTogTlNEYXRhID0gU2VjQ2VydGlmaWNhdGVDb3B5RGF0YShjZXJ0KVxuLy8gICAgICAgICBsZXQga2V5ID0gdGhpcy5rZXlGb3JEYXRhKGRhdGEsIG9yaWdpbik7XG4vLyAgICAgICAgIHRoaXMua2V5cy5hZGQoa2V5KTtcbi8vICAgICB9XG5cbi8vICAgICBwdWJsaWMgY29udGFpbnNDZXJ0aWZpY2F0ZShjZXJ0OiBhbnksIG9yaWdpbjpzdHJpbmcpIDogYm9vbGVhbiB7XG4vLyAgICAgICAgIGxldCBkYXRhOiBOU0RhdGEgPSBTZWNDZXJ0aWZpY2F0ZUNvcHlEYXRhKGNlcnQpXG4vLyAgICAgICAgIGxldCBrZXkgPSB0aGlzLmtleUZvckRhdGEoZGF0YSwgb3JpZ2luKVxuLy8gICAgICAgICByZXR1cm4gdGhpcy5rZXlzLmhhcyhrZXkpO1xuLy8gICAgIH1cblxuLy8gICAgIHByaXZhdGUga2V5Rm9yRGF0YShkYXRhOiBOU0RhdGEsIG9yaWdpbjpzdHJpbmcpIHtcbi8vICAgICAgICAgcmV0dXJuIGAke29yaWdpbn0vJHtkYXRhLmhhc2h9YDtcbi8vICAgICB9XG4vLyB9XG5cbi8vIGNvbnN0IF9jZXJ0U3RvcmUgPSBuZXcgQ2VydFN0b3JlKCk7XG5cbmV4cG9ydCBjbGFzcyBBcmdvbldlYlZpZXcgZXh0ZW5kcyBjb21tb24uQXJnb25XZWJWaWV3ICB7XG5cbiAgICBwcml2YXRlIF9pb3M6V0tXZWJWaWV3XG4gICAgcHJpdmF0ZSBfZGVsZWdhdGU6VUlXZWJWaWV3RGVsZWdhdGVcbiAgICBcbiAgICBwcml2YXRlIF9hcmdvbkRlbGVnYXRlOkFyZ29uV2ViVmlld0RlbGVnYXRlO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbiA9IFdLV2ViVmlld0NvbmZpZ3VyYXRpb24uYWxsb2MoKS5pbml0KCk7XG5cbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NJbmxpbmVNZWRpYVBsYXliYWNrID0gdHJ1ZTtcbiAgICAgICAgY29uZmlndXJhdGlvbi5hbGxvd3NBaXJQbGF5Rm9yTWVkaWFQbGF5YmFjayA9IHRydWU7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24uYWxsb3dzUGljdHVyZUluUGljdHVyZU1lZGlhUGxheWJhY2sgPSB0cnVlO1xuICAgICAgICBjb25maWd1cmF0aW9uLm1lZGlhVHlwZXNSZXF1aXJpbmdVc2VyQWN0aW9uRm9yUGxheWJhY2sgPSBXS0F1ZGlvdmlzdWFsTWVkaWFUeXBlcy5Ob25lO1xuICAgICAgICBjb25maWd1cmF0aW9uLnByb2Nlc3NQb29sID0gcHJvY2Vzc1Bvb2w7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFVzZXJTY3JpcHQoV0tVc2VyU2NyaXB0LmFsbG9jKCkuaW5pdFdpdGhTb3VyY2VJbmplY3Rpb25UaW1lRm9yTWFpbkZyYW1lT25seShgKCR7XG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgX29yaWdpbmFsTG9nID0gY29uc29sZS5sb2c7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5sb2cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe3R5cGU6J2xvZycsbWVzc2FnZTppbnNwZWN0RWFjaChhcmd1bWVudHMpfSkpO1xuICAgICAgICAgICAgICAgICAgICBfb3JpZ2luYWxMb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBfb3JpZ2luYWxXYXJuID0gY29uc29sZS53YXJuO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmxvZy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7dHlwZTond2FybicsbWVzc2FnZTppbnNwZWN0RWFjaChhcmd1bWVudHMpfSkpO1xuICAgICAgICAgICAgICAgICAgICBfb3JpZ2luYWxXYXJuLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgX29yaWdpbmFsRXJyb3IgPSBjb25zb2xlLmVycm9yO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5sb2cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe3R5cGU6J2Vycm9yJyxtZXNzYWdlOmluc3BlY3RFYWNoKGFyZ3VtZW50cyl9KSk7XG4gICAgICAgICAgICAgICAgICAgIF9vcmlnaW5hbEVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuaGFuZGxlZCBFcnJvcjogJyArIGUubWVzc2FnZSArICcgKCcgKyBlLnNvdXJjZSArICc6JyArIGUubGluZW5vICsgJyknKTtcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX3NlbmRBcmdvbkNoZWNrKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5oZWFkLnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT1hcmdvbl0nKSAhPT0gbnVsbCB8fCB0eXBlb2YoQXJnb24pICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnBlcnNpc3RlZCkgd2luZG93LmxvY2F0aW9uLnJlbG9hZChmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHdlYmtpdC5tZXNzYWdlSGFuZGxlcnMuYXJnb25jaGVjay5wb3N0TWVzc2FnZShcInRydWVcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWJraXQubWVzc2FnZUhhbmRsZXJzLmFyZ29uY2hlY2sucG9zdE1lc3NhZ2UoXCJmYWxzZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBfc2VuZEFyZ29uQ2hlY2spO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicGFnZXNob3dcIiwgX3NlbmRBcmdvbkNoZWNrKTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbnNwZWN0KG8sIGRlcHRoKSA6IHN0cmluZyB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvID09PSBudWxsKSByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvID09PSB1bmRlZmluZWQpIHJldHVybiBcInVuZGVmaW5lZFwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gby5tZXNzYWdlICsgJ1xcbicgKyBvLnN0YWNrO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG8gPT09ICdudW1iZXInIHx8IG8gaW5zdGFuY2VvZiBOdW1iZXIpIHJldHVybiAobykudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCBvIGluc3RhbmNlb2YgU3RyaW5nKSByZXR1cm4gPHN0cmluZz4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobykpIHJldHVybiBcIkFycmF5W1wiKyBvLmxlbmd0aCArXCJdXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIG8udG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlcHRoID4gMCA/IGAke2NsYXNzTmFtZShvKX0geyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMobykubWFwKChrZXkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnXFxuICAgICcgKyBrZXkgKyAnOiAnICsgaW5zcGVjdChvLCBkZXB0aC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCkgKyBPYmplY3QuZ2V0UHJvdG90eXBlT2YobykgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1xcbiAgICBfX3Byb3RvX186ICcgKyBjbGFzc05hbWUoT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pKSA6IFwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG59YCA6IGNsYXNzTmFtZShvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5zcGVjdEVhY2goYXJnczpJQXJndW1lbnRzKSA6IHN0cmluZyB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzQXJyYXkgPSBbXS5zbGljZS5jYWxsKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc0FycmF5Lm1hcCgoYXJnKT0+aW5zcGVjdChhcmcsMSkpLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2xhc3NOYW1lKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5hbWUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwtMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAnT2JqZWN0JykgbmFtZSA9IG8uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS50b1N0cmluZygpXG4gICAgICAgIH0oKSlgLCBXS1VzZXJTY3JpcHRJbmplY3Rpb25UaW1lLkF0RG9jdW1lbnRTdGFydCwgdHJ1ZSkpO1xuXG4gICAgICAgIC8vIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGUgVUlXZWJWaWV3IGNyZWF0ZWQgYnkgc3VwZXJjbGFzcyB3aXRoIFdLV2ViVmlldyBpbnN0YW5jZVxuICAgICAgICB0aGlzLm5hdGl2ZVZpZXcgPSB0aGlzLl9pb3MgPSBXS1dlYlZpZXcuYWxsb2MoKS5pbml0V2l0aEZyYW1lQ29uZmlndXJhdGlvbihDR1JlY3RaZXJvLCBjb25maWd1cmF0aW9uKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2RlbGVnYXRlIC8vIHJlbW92ZSByZWZlcmVuY2UgdG8gVUlXZWJWaWV3IGRlbGVnYXRlIGNyZWF0ZWQgYnkgc3VwZXIgY2xhc3NcbiAgICAgICAgY29uc3QgZGVsZWdhdGUgPSB0aGlzLl9hcmdvbkRlbGVnYXRlID0gQXJnb25XZWJWaWV3RGVsZWdhdGUuaW5pdFdpdGhPd25lcihuZXcgV2Vha1JlZih0aGlzKSk7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFNjcmlwdE1lc3NhZ2VIYW5kbGVyTmFtZShkZWxlZ2F0ZSwgXCJhcmdvblwiKTtcbiAgICAgICAgY29uZmlndXJhdGlvbi51c2VyQ29udGVudENvbnRyb2xsZXIuYWRkU2NyaXB0TWVzc2FnZUhhbmRsZXJOYW1lKGRlbGVnYXRlLCBcImFyZ29uY2hlY2tcIik7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24udXNlckNvbnRlbnRDb250cm9sbGVyLmFkZFNjcmlwdE1lc3NhZ2VIYW5kbGVyTmFtZShkZWxlZ2F0ZSwgXCJsb2dcIik7XG5cblx0ICAgIHRoaXMuX2lvcy5hbGxvd3NCYWNrRm9yd2FyZE5hdmlnYXRpb25HZXN0dXJlcyA9IHRydWU7XG5cdFx0dGhpcy5faW9zWydjdXN0b21Vc2VyQWdlbnQnXSA9IEFSR09OX1VTRVJfQUdFTlQ7XG5cbiAgICAgICAgLy8gc3R5bGUgYXBwcm9wcmlhdGVseVxuICAgICAgICB0aGlzLl9pb3Muc2Nyb2xsVmlldy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lvcy5sYXllci5tYXNrc1RvQm91bmRzID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHB1YmxpYyBfYXJnb25QYWdlcyA9IHt9O1xuICAgIHB1YmxpYyBfc2V0SXNBcmdvblBhZ2UoZmxhZzpib29sZWFuLCB1cmw6c3RyaW5nKSB7XG4gICAgICAgIGlmIChmbGFnKSB0aGlzLl9hcmdvblBhZ2VzW3VybF0gPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMuaXNBcmdvblBhZ2UgJiYgZmxhZykge1xuICAgICAgICAgICAgdGhpcy5faW9zLnNjcm9sbFZpZXcuYmFja2dyb3VuZENvbG9yID0gdXRpbHMuaW9zLmdldHRlcihVSUNvbG9yLCBVSUNvbG9yLmNsZWFyQ29sb3IpO1xuICAgICAgICAgICAgdGhpcy5faW9zLmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci5jbGVhckNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5vcGFxdWUgPSBmYWxzZTsgICAgIFxuICAgICAgICAgICAgY29tbW9uLmlzQXJnb25QYWdlUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2UodGhpcywgdHJ1ZSk7ICAgXG4gICAgICAgICAgICAvLyB0aGlzLnNldChcImlzQXJnb25QYWdlXCIsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNBcmdvblBhZ2UgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5zY3JvbGxWaWV3LmJhY2tncm91bmRDb2xvciA9IHV0aWxzLmlvcy5nZXR0ZXIoVUlDb2xvciwgVUlDb2xvci53aGl0ZUNvbG9yKTtcbiAgICAgICAgICAgIHRoaXMuX2lvcy5iYWNrZ3JvdW5kQ29sb3IgPSB1dGlscy5pb3MuZ2V0dGVyKFVJQ29sb3IsIFVJQ29sb3Iud2hpdGVDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9pb3Mub3BhcXVlID0gdHJ1ZTsgICAgICAgIFxuICAgICAgICAgICAgLy8gdGhpcy5zZXQoXCJpc0FyZ29uUGFnZVwiLCBmYWxzZSk7XG4gICAgICAgICAgICBjb21tb24uaXNBcmdvblBhZ2VQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZSh0aGlzLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZXZhbHVhdGVKYXZhc2NyaXB0KHNjcmlwdDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpPT57XG4gICAgICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCAocmVzdWx0LCBlcnJvcik9PntcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHJlamVjdChlcnJvci5sb2NhbGl6ZWREZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBldmFsdWF0ZUphdmFzY3JpcHRXaXRob3V0UHJvbWlzZShzY3JpcHQ6c3RyaW5nKSA6IHZvaWQge1xuICAgICAgICB0aGlzLl9pb3MuZXZhbHVhdGVKYXZhU2NyaXB0Q29tcGxldGlvbkhhbmRsZXIoc2NyaXB0LCA8YW55Pm51bGwpXG4gICAgfVxuXG4gICAgcHVibGljIGJyaW5nVG9Gcm9udCgpIHtcbiAgICAgICAgdGhpcy5faW9zLnN1cGVydmlldy5icmluZ1N1YnZpZXdUb0Zyb250KHRoaXMuX2lvcyk7XG4gICAgfVxuXG4gICAgcHVibGljIG9uTG9hZGVkKCkge1xuICAgICAgICBzdXBlci5vbkxvYWRlZCgpO1xuICAgICAgICB0aGlzLl9pb3MubmF2aWdhdGlvbkRlbGVnYXRlID0gdGhpcy5fYXJnb25EZWxlZ2F0ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb25VbmxvYWRlZCgpIHtcbiAgICAgICAgdGhpcy5faW9zLm5hdmlnYXRpb25EZWxlZ2F0ZSA9IDxhbnk+dW5kZWZpbmVkO1xuICAgICAgICBzdXBlci5vblVubG9hZGVkKCk7XG4gICAgfVxuXG4gICAgcmVsb2FkKCkge1xuICAgICAgICB0aGlzLl9pb3MucmVsb2FkRnJvbU9yaWdpbigpO1xuICAgIH1cbn1cblxuY2xhc3MgQXJnb25XZWJWaWV3RGVsZWdhdGUgZXh0ZW5kcyBOU09iamVjdCBpbXBsZW1lbnRzIFdLU2NyaXB0TWVzc2FnZUhhbmRsZXIsIFdLTmF2aWdhdGlvbkRlbGVnYXRlIHtcbiAgICBcbiAgICBwcml2YXRlIF9vd25lcjpXZWFrUmVmPEFyZ29uV2ViVmlldz47XG4gICAgXG4gICAgcHVibGljIHN0YXRpYyBpbml0V2l0aE93bmVyKG93bmVyOldlYWtSZWY8QXJnb25XZWJWaWV3Pikge1xuICAgICAgICBjb25zdCBkZWxlZ2F0ZSA9IDxBcmdvbldlYlZpZXdEZWxlZ2F0ZT5BcmdvbldlYlZpZXdEZWxlZ2F0ZS5uZXcoKVxuICAgICAgICBkZWxlZ2F0ZS5fb3duZXIgPSBvd25lcjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlYnZpZXcgPSA8V0tXZWJWaWV3Pm93bmVyLmdldCgpLmlvcztcbiAgICAgICAgd2Vidmlldy5hZGRPYnNlcnZlckZvcktleVBhdGhPcHRpb25zQ29udGV4dChkZWxlZ2F0ZSwgXCJ0aXRsZVwiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICB3ZWJ2aWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcIlVSTFwiLCAwLCA8YW55Pm51bGwpO1xuICAgICAgICB3ZWJ2aWV3LmFkZE9ic2VydmVyRm9yS2V5UGF0aE9wdGlvbnNDb250ZXh0KGRlbGVnYXRlLCBcImVzdGltYXRlZFByb2dyZXNzXCIsIDAsIDxhbnk+bnVsbCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfVxuXG4gICAgZGVhbGxvYygpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgY29uc3Qgd2VidmlldyA9IDxXS1dlYlZpZXc+IChvd25lciAmJiBvd25lci5pb3MpO1xuICAgICAgICB3ZWJ2aWV3LnJlbW92ZU9ic2VydmVyRm9yS2V5UGF0aCh0aGlzLCBcInRpdGxlXCIpO1xuICAgICAgICB3ZWJ2aWV3LnJlbW92ZU9ic2VydmVyRm9yS2V5UGF0aCh0aGlzLCBcIlVSTFwiKTtcbiAgICAgICAgd2Vidmlldy5yZW1vdmVPYnNlcnZlckZvcktleVBhdGgodGhpcywgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiKTtcbiAgICB9XG5cbiAgICBvYnNlcnZlVmFsdWVGb3JLZXlQYXRoT2ZPYmplY3RDaGFuZ2VDb250ZXh0KGtleVBhdGg6c3RyaW5nLCBvYmplY3Q6YW55LCBjaGFuZ2U6YW55LCBjb250ZXh0OmFueSkge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAoIW93bmVyKSByZXR1cm47ICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdrV2ViVmlldyA9IDxXS1dlYlZpZXc+b3duZXIuaW9zO1xuXG4gICAgICAgIHN3aXRjaCAoa2V5UGF0aCkge1xuXG4gICAgICAgICAgICBjYXNlIFwidGl0bGVcIjogXG4gICAgICAgICAgICBjb21tb24udGl0bGVQcm9wZXJ0eS5uYXRpdmVWYWx1ZUNoYW5nZShvd25lciwgd2tXZWJWaWV3LnRpdGxlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiVVJMXCI6IFxuICAgICAgICAgICAgY29tbW9uLnVybFByb3BlcnR5Lm5hdGl2ZVZhbHVlQ2hhbmdlKG93bmVyLCB3a1dlYlZpZXcuVVJMICYmIHdrV2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJlc3RpbWF0ZWRQcm9ncmVzc1wiOlxuICAgICAgICAgICAgY29tbW9uLnByb2dyZXNzUHJvcGVydHkubmF0aXZlVmFsdWVDaGFuZ2Uob3duZXIsIHdrV2ViVmlldy5lc3RpbWF0ZWRQcm9ncmVzcyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHByaXZhdGUgdXBkYXRlVVJMKCkge1xuICAgIC8vICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgIC8vICAgICBpZiAoIW93bmVyKSByZXR1cm47ICAgICBcbiAgICAvLyAgICAgY29uc3Qgd2tXZWJWaWV3ID0gPFdLV2ViVmlldz5vd25lci5pb3M7XG4gICAgLy8gICAgIG93bmVyLnNldChcInVybFwiLCB3a1dlYlZpZXcuVVJMICYmIHdrV2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcpO1xuICAgIC8vIH1cbiAgICBcbiAgICAvLyBXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyXG5cbiAgICB1c2VyQ29udGVudENvbnRyb2xsZXJEaWRSZWNlaXZlU2NyaXB0TWVzc2FnZSh1c2VyQ29udGVudENvbnRyb2xsZXI6V0tVc2VyQ29udGVudENvbnRyb2xsZXIsIG1lc3NhZ2U6V0tTY3JpcHRNZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgY29uc3QgdXJsID0gbWVzc2FnZS5mcmFtZUluZm8ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmc7XG4gICAgICAgIGlmIChtZXNzYWdlLm5hbWUgPT09ICdhcmdvbicpIHtcbiAgICAgICAgICAgIGlmICghb3duZXIuc2Vzc2lvbikgeyAgXG4gICAgICAgICAgICAgICAgLy8ganVzdCBpbiBjYXNlIHdlIHRob3VnaHQgYmVsb3cgdGhhdCB0aGUgcGFnZSB3YXMgbm90IGFuXG4gICAgICAgICAgICAgICAgLy8gYXJnb24gcGFnZSwgcGVyaGFwcyBiZWNhdXNlIGFyZ29uLmpzIGxvYWRlZCBhc3luY3Jvbm91c2x5IFxuICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgcHJvZ3JhbW1lciBkaWRuJ3Qgc2V0IHVwIGFuIGFyZ29uIG1ldGEgdGFnXG4gICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25QYWdlKHRydWUsIHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvd25lci5faGFuZGxlQXJnb25NZXNzYWdlKG1lc3NhZ2UuYm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5uYW1lID09PSAnbG9nJykge1xuICAgICAgICAgICAgb3duZXIuX2hhbmRsZUxvZ01lc3NhZ2UobWVzc2FnZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdhcmdvbmNoZWNrJykge1xuICAgICAgICAgICAgaWYgKCFvd25lci5zZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYm9keSA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25QYWdlKHRydWUsIHVybCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3duZXIuX3NldElzQXJnb25QYWdlKGZhbHNlLCB1cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBXS05hdmlnYXRpb25EZWxlZ2F0ZVxuXG4gICAgcHJpdmF0ZSBfcHJvdmlzaW9uYWxVUkwgOiBzdHJpbmc7XG5cbiAgICB3ZWJWaWV3RGVjaWRlUG9saWN5Rm9yTmF2aWdhdGlvbkFjdGlvbkRlY2lzaW9uSGFuZGxlcih3ZWJ2aWV3OldLV2ViVmlldywgbmF2aWdhdGlvbkFjdGlvbjpXS05hdmlnYXRpb25BY3Rpb24sIGRlY2lzaW9uSGFuZGxlcjoocG9saWN5OldLTmF2aWdhdGlvbkFjdGlvblBvbGljeSk9PnZvaWQpIHtcbiAgICAgICAgaWYgKG5hdmlnYXRpb25BY3Rpb24udGFyZ2V0RnJhbWUgJiYgbmF2aWdhdGlvbkFjdGlvbi50YXJnZXRGcmFtZS5tYWluRnJhbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hdmlnYXRpb25UeXBlOldLTmF2aWdhdGlvblR5cGUgPSBuYXZpZ2F0aW9uQWN0aW9uLm5hdmlnYXRpb25UeXBlO1xuICAgICAgICAgICAgdmFyIG5hdlR5cGU6TmF2aWdhdGlvblR5cGUgPSAnb3RoZXInO1xuICAgICAgICAgICAgc3dpdGNoIChuYXZpZ2F0aW9uVHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5MaW5rQWN0aXZhdGVkOlxuICAgICAgICAgICAgICAgICAgICBuYXZUeXBlID0gJ2xpbmtDbGlja2VkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkZvcm1TdWJtaXR0ZWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGUgPSAnZm9ybVN1Ym1pdHRlZCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5CYWNrRm9yd2FyZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdiYWNrRm9yd2FyZCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgV0tOYXZpZ2F0aW9uVHlwZS5SZWxvYWQ6XG4gICAgICAgICAgICAgICAgICAgIG5hdlR5cGUgPSAncmVsb2FkJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBXS05hdmlnYXRpb25UeXBlLkZvcm1SZXN1Ym1pdHRlZDpcbiAgICAgICAgICAgICAgICAgICAgbmF2VHlwZSA9ICdmb3JtUmVzdWJtaXR0ZWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgICAgIGlmIChvd25lcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5hdmlnYXRpb25BY3Rpb24ucmVxdWVzdC5VUkwuYWJzb2x1dGVTdHJpbmc7XG4gICAgICAgICAgICAgICAgaWYgKCFvd25lci5fYXJnb25QYWdlc1t1cmxdKSBvd25lci5fc2V0SXNBcmdvblBhZ2UoZmFsc2UsIHVybCk7XG4gICAgICAgICAgICAgICAgb3duZXJbJ19vbkxvYWRTdGFydGVkJ10odXJsLCBuYXZUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWNlLndyaXRlKFwiQXJnb25XZWJWaWV3LndlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uQWN0aW9uRGVjaXNpb25IYW5kbGVyKFwiICsgbmF2aWdhdGlvbkFjdGlvbi5yZXF1ZXN0LlVSTC5hYnNvbHV0ZVN0cmluZyArIFwiLCBcIiArIG5hdmlnYXRpb25BY3Rpb24ubmF2aWdhdGlvblR5cGUgKyBcIilcIiwgdHJhY2UuY2F0ZWdvcmllcy5EZWJ1Zyk7XG4gICAgICAgIGRlY2lzaW9uSGFuZGxlcihXS05hdmlnYXRpb25BY3Rpb25Qb2xpY3kuQWxsb3cpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEZWNpZGVQb2xpY3lGb3JOYXZpZ2F0aW9uUmVzcG9uc2VEZWNpc2lvbkhhbmRsZXIod2VidmlldzpXS1dlYlZpZXcsIG5hdmlnYXRpb25SZXNwb25zZTpXS05hdmlnYXRpb25SZXNwb25zZSwgZGVjaXNpb25IYW5kbGVyOihwb2xpY3k6V0tOYXZpZ2F0aW9uUmVzcG9uc2VQb2xpY3kpPT52b2lkKSB7XG4gICAgICAgIGRlY2lzaW9uSGFuZGxlcihXS05hdmlnYXRpb25SZXNwb25zZVBvbGljeS5BbGxvdyk7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZFN0YXJ0UHJvdmlzaW9uYWxOYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIHRoaXMuX3Byb3Zpc2lvbmFsVVJMID0gd2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmc7XG4gICAgfVxuXG4gICAgd2ViVmlld0RpZENvbW1pdE5hdmlnYXRpb24od2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24pIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKCFvd25lcikgcmV0dXJuO1xuICAgICAgICBvd25lci5fZGlkQ29tbWl0TmF2aWdhdGlvbigpO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsUHJvdmlzaW9uYWxOYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmICghb3duZXIpIHJldHVybjtcbiAgICAgICAgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHRoaXMuX3Byb3Zpc2lvbmFsVVJMLCBcIlByb3Zpc2lvbmFsIG5hdmlnYXRpb24gZmFpbGVkXCIpO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGaW5pc2hOYXZpZ2F0aW9uKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uKSB7XG4gICAgICAgIGNvbnN0IG93bmVyID0gdGhpcy5fb3duZXIuZ2V0KCk7XG4gICAgICAgIGlmIChvd25lcikgb3duZXJbJ19vbkxvYWRGaW5pc2hlZCddKHdlYlZpZXcuVVJMICYmIHdlYlZpZXcuVVJMLmFic29sdXRlU3RyaW5nKTtcbiAgICAgICAgLy8gdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICB3ZWJWaWV3RGlkRmFpbE5hdmlnYXRpb25XaXRoRXJyb3Iod2ViVmlldzogV0tXZWJWaWV3LCBuYXZpZ2F0aW9uOiBXS05hdmlnYXRpb24sIGVycm9yOk5TRXJyb3IpIHtcbiAgICAgICAgY29uc3Qgb3duZXIgPSB0aGlzLl9vd25lci5nZXQoKTtcbiAgICAgICAgaWYgKG93bmVyKSBvd25lclsnX29uTG9hZEZpbmlzaGVkJ10od2ViVmlldy5VUkwgJiYgd2ViVmlldy5VUkwuYWJzb2x1dGVTdHJpbmcsIGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uKTtcbiAgICAgICAgLy8gdGhpcy51cGRhdGVVUkwoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNoZWNrSWZXZWJDb250ZW50UHJvY2Vzc0hhc0NyYXNoZWQod2ViVmlldzogV0tXZWJWaWV3LCBlcnJvcjogTlNFcnJvcikgOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT0gV0tFcnJvckNvZGUuV2ViQ29udGVudFByb2Nlc3NUZXJtaW5hdGVkICYmIGVycm9yLmRvbWFpbiA9PSBcIldlYktpdEVycm9yRG9tYWluXCIpIHtcbiAgICAgICAgICAgIHdlYlZpZXcucmVsb2FkRnJvbU9yaWdpbigpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHdlYlZpZXdEaWRGYWlsUHJvdmlzaW9uYWxOYXZpZ2F0aW9uV2l0aEVycm9yKHdlYlZpZXc6IFdLV2ViVmlldywgbmF2aWdhdGlvbjogV0tOYXZpZ2F0aW9uLCBlcnJvcjogTlNFcnJvcikge1xuICAgICAgICBjb25zdCBvd25lciA9IHRoaXMuX293bmVyLmdldCgpO1xuICAgICAgICBpZiAob3duZXIpIG93bmVyWydfb25Mb2FkRmluaXNoZWQnXSh3ZWJWaWV3LlVSTCAmJiB3ZWJWaWV3LlVSTC5hYnNvbHV0ZVN0cmluZywgZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24pO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZVVSTCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNoZWNrSWZXZWJDb250ZW50UHJvY2Vzc0hhc0NyYXNoZWQod2ViVmlldywgZXJyb3IpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1cmwgPSBlcnJvci51c2VySW5mby5vYmplY3RGb3JLZXkoTlNVUkxFcnJvckZhaWxpbmdVUkxFcnJvcktleSkgYXMgTlNVUkw7XG4gICAgICAgIGlmICh1cmwgJiYgdXJsLmhvc3QgJiYgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVVbnRydXN0ZWQgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVIYXNCYWREYXRlIHx8IFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvclNlcnZlckNlcnRpZmljYXRlSGFzVW5rbm93blJvb3QgfHwgXG4gICAgICAgICAgICBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yU2VydmVyQ2VydGlmaWNhdGVOb3RZZXRWYWxpZCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnN0IGNlcnRDaGFpbiA9IGVycm9yLnVzZXJJbmZvLm9iamVjdEZvcktleSgnTlNFcnJvclBlZXJDZXJ0aWZpY2F0ZUNoYWluS2V5Jyk7XG4gICAgICAgICAgICAgICAgLy8gY29uc3QgY2VydCA9IGNlcnRDaGFpbiAmJiBjZXJ0Q2hhaW5bMF07XG4gICAgICAgICAgICAgICAgLy8gZGlhbG9ncy5jb25maXJtKGAke2Vycm9yLmxvY2FsaXplZERlc2NyaXB0aW9ufSBXb3VsZCB5b3UgbGlrZSB0byBjb250aW51ZSBhbnl3YXk/YCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGNvbnN0IG9yaWdpbiA9IGAke3VybC5ob3N0fToke3VybC5wb3J0fHw0NDN9YDtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIF9jZXJ0U3RvcmUuYWRkQ2VydGlmaWNhdGUoY2VydCwgb3JpZ2luKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIHdlYlZpZXcubG9hZFJlcXVlc3QobmV3IE5TVVJMUmVxdWVzdCh7VVJMOnVybH0pKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgICAgIC8vIH0pLmNhdGNoKCgpPT57fSk7XG5cbiAgICAgICAgICAgICAgICBkaWFsb2dzLmFsZXJ0KGVycm9yLmxvY2FsaXplZERlc2NyaXB0aW9uICsgXCIgQSBidWcgaW4gQXJnb240IHByZXZlbnRzIHVzIGZyb20gY29udGludWluZy4gUGxlYXNlIHVzZSBhIHNpdGUgd2l0aCBhIHZhbGlkIGNlcnRpZmljYXRlLiAgV2Ugd2lsbCBmaXggdGhpcyBzb29uLlwiKTtcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgJiYgdXJsLmhvc3QgJiZcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JDYW5ub3RGaW5kSG9zdCB8fFxuICAgICAgICAgICAgZXJyb3IuY29kZSA9PT0gTlNVUkxFcnJvckNhbm5vdENvbm5lY3RUb0hvc3QpIHtcbiAgICAgICAgICAgICAgICBkaWFsb2dzLmFsZXJ0KFwiQ2Fubm90IGNvbm5lY3QgdG8gaG9zdC4gUGxlYXNlIGNoZWNrIHRoZSBVUkwgb3IgdGhlIHNlcnZlciBjb25uZWN0aW9uLlwiKTtcbiAgICAgICAgfSBlbHNlIGlmICh1cmwgJiYgdXJsLmhvc3QgJiZcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IE5TVVJMRXJyb3JUaW1lZE91dFxuICAgICAgICAgICAgLy98fCBlcnJvci5jb2RlID09PSBOU1VSTEVycm9yQ2FuY2VsbGVkXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBkaWFsb2dzLmFsZXJ0KFwiSG9zdCBpcyBub3QgcmVzcG9uZGluZy4gUGxlYXNlIGNoZWNrIGlmIHRoZSBob3N0IHN1cHBvdHMgSFRUUFMuXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29tbWVudCBvdXQgdW50aWwgaHR0cHM6Ly9naXRodWIuY29tL05hdGl2ZVNjcmlwdC9pb3MtcnVudGltZS9pc3N1ZXMvNzQyIGlzIGZpeGVkXG5cdC8vIHdlYlZpZXdEaWRSZWNlaXZlQXV0aGVudGljYXRpb25DaGFsbGVuZ2VDb21wbGV0aW9uSGFuZGxlcih3ZWJWaWV3OiBXS1dlYlZpZXcsIGNoYWxsZW5nZTogTlNVUkxBdXRoZW50aWNhdGlvbkNoYWxsZW5nZSwgY29tcGxldGlvbkhhbmRsZXI6IChwMTogTlNVUkxTZXNzaW9uQXV0aENoYWxsZW5nZURpc3Bvc2l0aW9uLCBwMj86IE5TVVJMQ3JlZGVudGlhbCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIC8vICAgICAvLyBJZiB0aGlzIGlzIGEgY2VydGlmaWNhdGUgY2hhbGxlbmdlLCBzZWUgaWYgdGhlIGNlcnRpZmljYXRlIGhhcyBwcmV2aW91c2x5IGJlZW5cbiAgICAvLyAgICAgLy8gYWNjZXB0ZWQgYnkgdGhlIHVzZXIuXG4gICAgLy8gICAgIGNvbnN0IG9yaWdpbiA9IGAke2NoYWxsZW5nZS5wcm90ZWN0aW9uU3BhY2UuaG9zdH06JHtjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnBvcnR9YDtcbiAgICAvLyAgICAgY29uc3QgdHJ1c3QgPSBjaGFsbGVuZ2UucHJvdGVjdGlvblNwYWNlLnNlcnZlclRydXN0O1xuICAgIC8vICAgICBjb25zdCBjZXJ0ID0gU2VjVHJ1c3RHZXRDZXJ0aWZpY2F0ZUF0SW5kZXgodHJ1c3QsIDApO1xuICAgIC8vICAgICBpZiAoY2hhbGxlbmdlLnByb3RlY3Rpb25TcGFjZS5hdXRoZW50aWNhdGlvbk1ldGhvZCA9PSBOU1VSTEF1dGhlbnRpY2F0aW9uTWV0aG9kU2VydmVyVHJ1c3QgJiZcbiAgICAvLyAgICAgICAgIHRydXN0ICYmIGNlcnQgJiYgX2NlcnRTdG9yZS5jb250YWluc0NlcnRpZmljYXRlKGNlcnQsIG9yaWdpbikpIHtcbiAgICAvLyAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5Vc2VDcmVkZW50aWFsLCBuZXcgTlNVUkxDcmVkZW50aWFsKHRydXN0KSlcbiAgICAvLyAgICAgICAgIHJldHVybjtcbiAgICAvLyAgICAgfVxuXG4gICAgLy8gICAgIGNvbXBsZXRpb25IYW5kbGVyKE5TVVJMU2Vzc2lvbkF1dGhDaGFsbGVuZ2VEaXNwb3NpdGlvbi5QZXJmb3JtRGVmYXVsdEhhbmRsaW5nLCB1bmRlZmluZWQpO1xuICAgIC8vIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgT2JqQ1Byb3RvY29scyA9IFtXS1NjcmlwdE1lc3NhZ2VIYW5kbGVyLCBXS05hdmlnYXRpb25EZWxlZ2F0ZV07XG59Il19