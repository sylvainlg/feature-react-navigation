# feature-react-navigation - _Feature based navigation using react-navigation_

**feature-react-navigation** is a [feature-u](https://feature-u.js.org/) module which provide a routing aspect into your features using [react-navigation](https://reactnavigation.org/).

The module aim to build a single navigation tree with routes provided by each feature registred in your feature-u instance. Your features don't have the knowledge off the final tree, they only have to expose their routes throught the `route` aspect.

## Getting started

`$ yarn add feature-react-navigation`

Additionnally, you may need peerDependencies installed :

```
$ yarn add feature-u
$ yarn add @react-navigation/core
$ yarn add @react-navigation/native
or
$ yarn add @react-navigation/web
```

## Usage

### 1 - Register the aspect

Within your mainline, register the feature-react-navigation `routeAspect` to feature-u's [launchApp()](https://feature-u.js.org/cur/api.html#launchApp) method.

**Please note** that routeAspect has 2 required parameters (see below for details) :

- `config.createAppFunction$`
- `config.navigationPattern$`

```js
import {launchApp}            from 'feature-u';
import { routeAspect } 				from 'feature-react-navigation'; // **1**
import { createAppContainer } from '@react-navigation/native';
import features               from './feature';

// configure Aspects (as needed) // **2**
const routeAspect = createRouteAspect();
// For react-native application
routeAspect.config.createAppFunction$ = createAppContainer;

export default launchApp({

  aspects: [
    routeAspect,                 // **1**
    ... other Aspects here
  ],

  features,

  registerRootAppElm(rootAppElm) {
      // *3*
      AppRegistry.registerComponent(appName, () => () => rootAppElm); // convert rootAppElm to a React Component
    },
});
```

**config.createAppFunction\$**

Since v4, `react-navigation` is available on both react-native and react (web) platforms. The bootstrap for each platform differ a bit :

- react-native : https://reactnavigation.org/docs/en/hello-react-navigation.html
- react web : https://reactnavigation.org/docs/en/web-support.html

You can choose, the method you like to create your application by passing the initilization method to `config.createAppFunction$`.

```js
// For react-native application
import { createAppContainer } from '@react-navigation/native';
routeAspect.config.createAppFunction$ = createAppContainer;

// For react web application
import { createBrowserApp } from '@react-navigation/web';
routeAspect.config.createAppFunction$ = createBrowserApp;
```

With this configuration, the module stay pure `react` module. Any adherence with `react-native` is no longer required.

**config.navigationPattern\$**

In mobile application, the navigation stack could be a lot more complex than on the web and `react-navigation` respond to that complexity by providing some different navigators ([stack](https://reactnavigation.org/docs/en/stack-navigator.html), [switch](https://reactnavigation.org/docs/en/switch-navigator.html), [tab](https://reactnavigation.org/docs/en/bottom-tab-navigator.html), [drawer](https://reactnavigation.org/docs/en/drawer-navigator.html)). `config.navigationPattern$` is the way to deal with it in `feature-react-navigation`.

Beside, features don't have to know how the navigation is organize in the final application. Even, you may want to re-use some feature across applications whithout inheriting the same navigation stack. With this way of building navigation stack, your application have total control about it.

- navigator: create[Navigator] function
- navigationOptions: options taken by the navigator function
- routes: list of named route from features
- featureRoutes: list of feature names, expended to each routes starting by the feature name - see [`Promote routes`]

```js
import createAnimatedSwitchNavigator from 'react-navigation-animated-switch';
import { createStackNavigator } from 'react-navigation-stack';

config.navigationPattern$ = {
  navigator: createAnimatedSwitchNavigator,
  routes: {
    startup: {
      navigator: createStackNavigator,
      navigationOptions: {
        initialRouteName: 'app.START',
      },
      routes: ['app.START'],
    },
    unauth: {
      navigator: createStackNavigator,
      navigationOptions: {
        initialRouteName: 'app-login.LOGIN',
      },
      featureRoutes: ['app-login', 'app-subscription'],
    },
    auth: {
      navigator: createStackNavigator,
      navigationOptions: {
        initialRouteName: 'app-home.HOME',
      },
      featureRoutes: ['app-home', 'app-profil', 'app-offers'],
    },
  },
};
```

### 2 - Promote routes

Within each feature that promotes UI Screens, simply register the feature's route through the `Feature.route` property _(using **feature-u**'s [`createFeature()`])_.

In the sample, `login` feature promotes somes routes in a `react-navigation` [compatible format](https://reactnavigation.org/docs/en/hello-react-navigation.html). It's **strongly encourage** to prefix all route names by the feature name in order to use [`featureRoutes`] pattern configuration.

**src/feature/login/index.js**

```js
import React            from 'react';
import {createFeature}  from 'feature-u';

import fname            from './feature-name'
import {LoginScreen,
    LoginSuccessScreen} from './screens';

export default createFeature({

  name:  'login',

  route: {
    routes: {
      [`${fname}.LOGIN`]: {
        screen: LoginScreen,
      },
      [`${fname}.SUCCESS`]: {
        screen: LoginSuccessScreen,
      },
    },
  },

  ... snip snip
});
```
