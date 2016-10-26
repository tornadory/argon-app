import * as URI from 'urijs';
import * as Argon from '@argonjs/argon';
import * as application from 'application';
import * as utils from 'utils/utils';
import {SearchBar} from 'ui/search-bar';
import {Page} from 'ui/page';
import {CreateViewEventData} from 'ui/placeholder';
import {Button} from 'ui/button';
import {View, getViewById} from 'ui/core/view';
import {HtmlView} from 'ui/html-view'
import {Color} from 'color';
import {PropertyChangeData} from 'data/observable';
import {AnimationCurve} from 'ui/enums'
import {GestureTypes} from 'ui/gestures'

import {SessionEventData} from 'argon-web-view';
import {BrowserView} from './components/browser-view';
import * as bookmarks from './components/common/bookmarks';
import {manager, appViewModel, AppViewModel, LoadUrlEventData, vuforiaDelegate} from './components/common/AppViewModel';

manager.reality.registerLoader(new class HostedRealityLoader extends Argon.RealityLoader {
    type = 'hosted';
    load(reality: Argon.RealityView, callback:(realitySession:Argon.SessionPort)=>void):void {
        const url:string = reality.uri;
        const webView = browserView.realityLayer.webView;
        let sessionCallback = (data:SessionEventData)=>{
            webView.off('session', sessionCallback);
            callback(data.session);
        }
        webView.on('session', sessionCallback);
        if (webView.src === url) webView.reload();
        else webView.src = url;
    }
});

//import * as orientationModule from 'nativescript-screen-orientation';
var orientationModule = require("nativescript-screen-orientation");

export let page:Page;
export let layout:View;
export let touchOverlayView:View;
export let headerView:View;
export let menuView:View;
export let browserView:BrowserView;
export let bookmarksView:View;
export let realityChooserView:View;

let searchBar:SearchBar;
let iosSearchBarController:IOSSearchBarController;

appViewModel.on('propertyChange', (evt:PropertyChangeData)=>{
    if (evt.propertyName === 'currentUri') {
        setSearchBarText(appViewModel.currentUri);
    }
    else if (evt.propertyName === 'viewerEnabled') {
        vuforiaDelegate.viewerEnabled = evt.value;
        if (evt.value) {
            orientationModule.setCurrentOrientation("landscape");
        } else {
            orientationModule.setCurrentOrientation("portrait");
            orientationModule.setCurrentOrientation("all");
        }

    }
    else if (evt.propertyName === 'menuOpen') {
        if (evt.value) {
            appViewModel.hideOverview();
            menuView.visibility = "visible";
            menuView.animate({
                scale: {
                    x: 1,
                    y: 1,
                },
                duration: 150,
                opacity: 1,
                curve: AnimationCurve.easeInOut
            });
            touchOverlayView.visibility = 'visible';
            touchOverlayView.on(GestureTypes.touch,()=>{
                touchOverlayView.off(GestureTypes.touch);
                touchOverlayView.visibility = 'collapse';
                appViewModel.hideMenu();
            });
        } else {
            menuView.animate({
                scale: {
                    x: 0,
                    y: 0,
                },
                duration: 150,
                opacity: 0,
                curve: AnimationCurve.easeInOut
            }).then(() => {
                menuView.visibility = "collapse";
            });
            touchOverlayView.off(GestureTypes.touch);
            touchOverlayView.visibility = 'collapse';
        }
    }
    else if (evt.propertyName === 'overviewOpen') {
        if (evt.value) {
            browserView.showOverview();
            appViewModel.hideBookmarks();
            searchBar.animate({
                translate: {x:-100, y:0},
                opacity: 0,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                searchBar.visibility = 'collapse';
            })
            const addButton = headerView.getViewById('addButton');
            addButton.visibility = 'visible';
            addButton.opacity = 0;
            addButton.translateX = -10;
            addButton.animate({
                translate: {x:0,y:0},
                opacity:1
            })
        } else {
            browserView.hideOverview();
            if (!appViewModel.layerDetails.uri) appViewModel.showBookmarks();
            searchBar.visibility = 'visible';
            searchBar.animate({
                translate: {x:0, y:0},
                opacity: 1,
                curve: AnimationCurve.easeInOut
            })
            const addButton = headerView.getViewById('addButton');
            addButton.animate({
                translate: {x:-10, y:0},
                opacity:0
            }).then(()=>{
                addButton.visibility = 'collapse';
            })
        }
    }
    else if (evt.propertyName === 'realityChooserOpen') {
        if (evt.value) {
            realityChooserView.visibility = 'visible';
            realityChooserView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:1,
                duration: 150,
                curve: AnimationCurve.easeInOut
            })
            appViewModel.showCancelButton();
        } else {
            realityChooserView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:0,
                duration: 150,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                realityChooserView.visibility = 'collapse';
                realityChooserView.scaleX = 0.9;
                realityChooserView.scaleY = 0.9;
            })
            blurSearchBar();
            appViewModel.hideCancelButton();
        }
    }
    else if (evt.propertyName === 'bookmarksOpen') {
        if (evt.value) {
            bookmarksView.visibility = 'visible';
            bookmarksView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:1,
                duration: 150,
                curve: AnimationCurve.easeInOut
            })
        } else {
            bookmarksView.animate({
                scale: {
                    x:1,
                    y:1
                },
                opacity:0,
                duration: 150,
                curve: AnimationCurve.easeInOut
            }).then(()=>{
                bookmarksView.visibility = 'collapse';
                bookmarksView.scaleX = 0.9;
                bookmarksView.scaleY = 0.9;
            })
            blurSearchBar();
            appViewModel.hideCancelButton();
        }
    } 
    else if (evt.propertyName === 'cancelButtonShown') {
        if (evt.value) {
            const overviewButton = headerView.getViewById('overviewButton');
            overviewButton.animate({
                opacity:0
            }).then(()=>{
                overviewButton.visibility = 'collapse';
            })
            const menuButton = headerView.getViewById('menuButton');
            menuButton.animate({
                opacity:0
            }).then(()=>{
                menuButton.visibility = 'collapse';
            })
            const cancelButton = headerView.getViewById('cancelButton');
            cancelButton.visibility = 'visible';
            cancelButton.animate({
                opacity:1
            });
        } else {
            const overviewButton = headerView.getViewById('overviewButton');
            overviewButton.visibility = 'visible';
            overviewButton.animate({
                opacity:1
            })
            const menuButton = headerView.getViewById('menuButton');
            menuButton.visibility = 'visible';
            menuButton.animate({
                opacity:1
            })
            const cancelButton = headerView.getViewById('cancelButton');
            cancelButton.animate({
                opacity:0
            }).then(()=>{
                cancelButton.visibility = 'collapse';
            })
            
            layout.off(GestureTypes.touch);
        }
    }
})

export function pageLoaded(args) {
    
    page = args.object;
    page.bindingContext = appViewModel;
    appViewModel.setReady();

    // Set the icon for the menu button
    const menuButton = <Button> page.getViewById("menuButton");
    menuButton.text = String.fromCharCode(0xe5d4);

    // Set the icon for the overview button
    const overviewButton = <Button> page.getViewById("overviewButton");
    overviewButton.text = String.fromCharCode(0xe53b);
    
    // focus on the topmost layer
    browserView.setFocussedLayer(browserView.layers[browserView.layers.length-1]);

    // workaround (see https://github.com/NativeScript/NativeScript/issues/659)
    if (page.ios) {
        setTimeout(()=>{
            page.requestLayout();
        }, 0)
        application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, () => {
            page.requestLayout();
        });
    }
    
    appViewModel.showBookmarks();
    
    manager.session.errorEvent.addEventListener((error)=>{
        alert(error.message);
        if (error.stack) console.log(error.stack);
    })

    application.on(application.orientationChangedEvent, ()=>{
        const orientation = manager.device['getDisplayOrientation']();
        if (orientation === 90 || orientation === -90 || appViewModel.viewerEnabled) 
            page.actionBarHidden = true;
        else 
            page.actionBarHidden = false;
    });
}

export function layoutLoaded(args) {
    layout = args.object
    if (layout.ios) {
        layout.ios.layer.masksToBounds = false;
    }
}

export function headerLoaded(args) {
    headerView = args.object;
}

export function searchBarLoaded(args) {
    searchBar = args.object;

    searchBar.on(SearchBar.submitEvent, () => {
        let urlString = searchBar.text;
        if (urlString.indexOf('//') === -1) urlString = '//' + urlString;
        
        const url = URI(urlString);
        if (url.protocol() !== "http" && url.protocol() !== "https") {
            url.protocol("http");
        }
        setSearchBarText(url.toString());
        appViewModel.loadUrl(url.toString());
        appViewModel.hideBookmarks();
        appViewModel.hideRealityChooser();
        appViewModel.hideCancelButton();
    });

    if (application.ios) {
        iosSearchBarController = new IOSSearchBarController(searchBar);
    }
}

function setSearchBarText(url:string) {
    if (iosSearchBarController) {
        iosSearchBarController.setText(url);
    } else {
        searchBar.text = url;
    }
}

function blurSearchBar() {
    if (searchBar.ios) {
        (searchBar.ios as UISearchBar).resignFirstResponder();
    }
}

export function browserViewLoaded(args) {
    browserView = args.object;
    
    appViewModel.on(AppViewModel.loadUrlEvent, (data:LoadUrlEventData)=>{
        browserView.loadUrl(data.url);
    })

    // Setup the debug view
    let debug:HtmlView = <HtmlView>browserView.page.getViewById("debug");
    debug.horizontalAlignment = 'stretch';
    debug.verticalAlignment = 'stretch';
    debug.backgroundColor = new Color(150, 255, 255, 255);
    debug.visibility = "collapsed";
    debug.isUserInteractionEnabled = false;
}


export function bookmarksViewLoaded(args) {
    bookmarksView = args.object;
    bookmarksView.scaleX = 0.9;
    bookmarksView.scaleY = 0.9;
    bookmarksView.opacity = 0;
}

export function realityChooserLoaded(args) {
    realityChooserView = args.object;
    realityChooserView.scaleX = 0.9;
    realityChooserView.scaleY = 0.9;
    realityChooserView.opacity = 0;
}

export function touchOverlayLoaded(args) {
    touchOverlayView = args.object;
}

// initialize some properties of the menu so that animations will render correctly
export function menuLoaded(args) {
    menuView = args.object;
    menuView.originX = 1;
    menuView.originY = 0;
    menuView.scaleX = 0;
    menuView.scaleY = 0;
    menuView.opacity = 0;
}

export function onSearchBarTap(args) {
    appViewModel.showBookmarks();
    appViewModel.showCancelButton();
}

export function onCancel(args) {
    if (!!appViewModel.layerDetails.uri) appViewModel.hideBookmarks();
    appViewModel.hideRealityChooser();
    appViewModel.hideCancelButton();
    blurSearchBar();
}

export function onAddChannel(args) {
    browserView.addLayer();
    appViewModel.hideMenu();
}

export function onReload(args) {
    if (browserView.focussedLayer === browserView.realityLayer) {
        manager.reality.setDesired(manager.reality.getCurrent());
    } else {
        browserView.focussedLayer.webView.reload();
    }
}

export function onFavoriteToggle(args) {
    const url = appViewModel.layerDetails.uri;
    const bookmarkItem = bookmarks.favoriteMap.get(url);
    if (!bookmarkItem) {
        bookmarks.favoriteList.push(new bookmarks.BookmarkItem({
            uri: url,
            title: browserView.focussedLayer.webView.title
        }));
    } else {
        var i = bookmarks.favoriteList.indexOf(bookmarkItem);
        bookmarks.favoriteList.splice(i,1);
    }
}

export function onInteractionToggle(args) {
    appViewModel.toggleInteractionMode();
}

export function onOverview(args) {
    appViewModel.toggleOverview();
    appViewModel.setDebugEnabled(false);
    appViewModel.hideMenu();
}

export function onMenu(args) {
    appViewModel.toggleMenu();
}

export function onSelectReality(args) {
    appViewModel.showRealityChooser();
    appViewModel.showCancelButton();
    appViewModel.hideMenu();
}

export function onSettings(args) {
    //code to open the settings view goes here
    appViewModel.hideMenu();
}

export function onViewerToggle(args) {
    appViewModel.toggleViewer();
    appViewModel.hideMenu();
}

export function onDebugToggle(args) {
    appViewModel.toggleDebug();
}

class IOSSearchBarController {

    private uiSearchBar:UISearchBar;
    private textField:UITextField;

    constructor(public searchBar:SearchBar) {
        this.uiSearchBar = searchBar.ios;
        this.textField = this.uiSearchBar.valueForKey("searchField");

        this.uiSearchBar.keyboardType = UIKeyboardType.URL;
        this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.None;
        this.uiSearchBar.searchBarStyle = UISearchBarStyle.Minimal;
        this.uiSearchBar.returnKeyType = UIReturnKeyType.Go;
        this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.Search, UIControlState.Normal)
        
        this.textField.leftViewMode = UITextFieldViewMode.Never;

        const textFieldEditHandler = () => {
            appViewModel.hideMenu();
            if (utils.ios.getter(UIResponder, this.uiSearchBar.isFirstResponder)) {
                if (browserView.focussedLayer === browserView.realityLayer) {
                    appViewModel.showRealityChooser();
                } else {
                    appViewModel.showBookmarks();
                }
                appViewModel.showCancelButton();
                
                setTimeout(()=>{
                    if (this.uiSearchBar.text === "") {
                        this.uiSearchBar.text = appViewModel.layerDetails.uri;
                        this.setPlaceholderText("");
                        this.textField.selectedTextRange = this.textField.textRangeFromPositionToPosition(this.textField.beginningOfDocument, this.textField.endOfDocument);
                    }
                }, 500)
                
                layout.on(GestureTypes.touch,()=>{
                    blurSearchBar();
                    layout.off(GestureTypes.touch);
                    if (!browserView.focussedLayer.webView.url) appViewModel.hideCancelButton();
                });
            } else {
                this.setPlaceholderText(appViewModel.layerDetails.uri);
                this.uiSearchBar.text = "";
            }
        }

        application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
        application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);
    }

    private setPlaceholderText(text:string) {
        if (text) {
            var attributes: NSMutableDictionary<string,any> = NSMutableDictionary.new<string,any>().init();
            attributes.setObjectForKey(utils.ios.getter(UIColor,UIColor.blackColor), NSForegroundColorAttributeName);
            this.textField.attributedPlaceholder = NSAttributedString.alloc().initWithStringAttributes(text, attributes);
        } else {
            this.textField.placeholder = searchBar.hint;
        }
    }

    public setText(url) {
        if (!utils.ios.getter(UIResponder, this.uiSearchBar.isFirstResponder)) {
            this.setPlaceholderText(url);
        }
    }
}
