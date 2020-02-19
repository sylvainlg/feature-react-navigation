import React from 'react';
import * as ReactIs from 'react-is';
import { createAspect, launchApp } from 'feature-u';
import has from 'lodash.has';

import verify from './util/verify';

export const logf = launchApp.diag.logf.newLogger(
  '- ***feature-react-navigation*** routeAspect: '
);

export function createRouteAspect(config = {}) {
  // validate parameters
  const check = verify.prefix('createRouteAspect() parameter violation: ');

  check(
    typeof config === 'object',
    `
    config parameter must be an object

    Allowed parameters are : 
    - name type string
    - createAppFunction type function
    - navigationPattern type object
  `
  );

  const { name = 'route', createAppFunction, navigationPattern } = config;

  check(name, 'name is required');
  check(typeof name === 'string', 'name must be a string');

  // Other fields are tested in genesis function

  return createAspect({
    name,
    genesis,
    validateFeatureContent,
    assembleFeatureContent,
    initialRootAppElm,
    config: {
      // createAppFunction must contain createAppContainer (react-native) or createBrowserApp (react web) function (REQUIRED CONFIGURATION)
      createAppFunction$: createAppFunction,
      // PUBLIC: navigationPattern describe how to build navigator's tree (REQUIRED CONFIGURATION)
      navigationPattern$: navigationPattern,
    },
  });
}

/**
 * Control aspect config
 */
function genesis() {
  logf('genesis() validating required config.navigationPattern$');

  if (!this.config.navigationPattern$) {
    return `the ${this.name} aspect requires navigationPattern to be configured in createRouteAspect object parameter !`;
  }

  if (
    !this.config.createAppFunction$ ||
    typeof this.config.createAppFunction$ !== 'function'
  ) {
    return `the ${this.name} aspect requires config.createAppFunction$ to be configured (at run-time)!
    
    This value must be one of these functions :
    - import { createAppContainer } from "@react-navigation/native";
    - import { createBrowserApp } from "@react-navigation/web";
    `;
  }
  return null;
}

/**
 * Validate routes configuration
 *
 * @param {Object} feature Feature configuration
 *
 * @private
 */
function validateFeatureContent(feature) {
  if (has(feature, 'route')) {
    if (
      typeof feature.route !== 'object' ||
      typeof feature.route.routes !== 'object'
    ) {
      return 'If a feature expose some routing, routes must be exposed under feature.route.routes param';
    } else {
      for (const key in feature.route.routes) {
        if (has(feature.route.routes, key)) {
          const el = feature.route.routes[key];
          if (!ReactIs.isValidElementType(el.screen)) {
            return 'Features routes must have a valid React elements under screen property';
          }
        }
      }
    }
  }

  return null; // valid
}

/**
 * Accumulate all routes from our features.
 *
 * @param {Fassets} fassets the Fassets object used in cross-feature-communication.
 *
 * @param {Feature[]} activeFeatures - The set of active (enabled)
 * features that comprise this application.
 *
 * @private
 */
function assembleFeatureContent(fassets, activeFeatures) {
  // accumulate all routes from our features
  const r = {};
  activeFeatures.reduce((accum, feature) => {
    if (!has(feature[this.name], 'routes')) {
      return accum;
    }

    const { routes: routeContent } = feature[this.name];
    if (routeContent) {
      Object.assign(r, routeContent);
    }
    return accum;
  }, []);

  // retain for later use
  this.routes = r;
}

/**
 * Inject our `<AppContainer>` in the `rootAppElm`.
 *
 * We use `initialRootAppElm()` because `<AppContainer>` does NOT
 * support children (by design).
 *
 * @param {Fassets} fassets the Fassets object used in cross-feature-communication.
 *
 * @param {reactElm} curRootAppElm - the current react app element root.
 *
 * @return {reactElm} rootAppElm seeded with our `<AppContainer>`.
 *
 * @private
 */
function initialRootAppElm(fassets, curRootAppElm) {
  // no-op if we have NO routes
  if (
    Object.keys(this.routes).length === 0 &&
    this.routes.constructor === Object
  ) {
    // NOTE: for this condition, the appropriate logf.force() is generated (above)
    return curRootAppElm;
  }

  // insure we don't clober any supplied content
  // ... by design, <AppContainer> doesn't support children
  if (curRootAppElm) {
    throw new Error(
      '***ERROR*** Please register routeAspect (from feature-react-navigation) before other Aspects ' +
        'that inject content in the rootAppElm ... <AppContainer> does NOT support children.'
    );
  }

  if (!this.config.navigationPattern$) {
    throw new Error(
      `
      ***ERROR*** Navigation pattern must be defined

      Sample:

      {
        navigator: createSwitchNavigator,
        routes: {
          startup: {
            navigator: createStackNavigator,
            navigationOptions: {
              initialRouteName: 'app.START',
            },
            routes: ['app.START']
          },
          unauth: {
            navigator: createStackNavigator,
            featureRoutes: ['app-login', 'app-subscription']
          },
          auth: {
            navigator: createStackNavigator,
            featureRoutes: ['app-home', 'app-profil', 'app-offers']
          }
        }
      }
      `
    );
  }

  // seed the rootAppElm with our StateRouter
  logf(
    `initialRootAppElm() introducing <AppContainer> component into rootAppElm`
  );
  const AppNavigator = buildRoutes(
    this.routes,
    fassets,
    this.config.navigationPattern$
  );

  const AppContainer = this.config.createAppFunction$(AppNavigator);

  return <AppContainer />;
}

// exported for test purpose only
export function buildRoutes(allroutes, fassets, config) {
  if (!config.navigator || !typeof config.navigator === 'function') {
    throw new Error(
      'Each level of navigation pattern must define a navigator creator function (key: `navigator`), current: ' +
        config.navigator
    );
  }

  // If routes config is an array, expand it
  if (config.routes) {
    if (Array.isArray(config.routes)) {
      config.routes = config.routes.reduce((acc, el) => {
        if (typeof el === 'string') {
          if (has(allroutes, el)) {
            acc[el] = allroutes[el];
          } else {
            throw new Error(
              `feature-react-navigation::buildRoutes : expanding route:${el} failed, route not found`
            );
          }
        } else {
          acc[el] = el;
        }
        return acc;
      }, {});
    }
  }

  // If featureRoutes configured, then expand it to classic routes
  if (config.featureRoutes) {
    // Get all routes for targeted routes
    const expandedRoutes = config.featureRoutes.reduce((accumulator, value) => {
      return Object.assign(
        accumulator,
        filterObjectKeyStartsWith(allroutes, value)
      );
    }, {});

    // Merge features routes with routes.
    // Manual route configurations prevault on features' auto-detected routes
    config.routes = Object.assign({}, config.routes || {}, expandedRoutes);

    // Warn when override ?
  }

  // Build routes
  if (typeof config.routes !== 'object') {
    throw new Error(
      'feature-react-navigation::buildRoutes : no routes detected, please check your' +
        ' navigationPattern config property and exposed routes from features, actual config value : ' +
        JSON.stringify(config)
    );
  }

  const keys = Object.keys(config.routes);
  const routes = {};

  for (let i = 0; i < keys.length; i++) {
    const el = keys[i];
    routes[el] = config.routes[el].navigator
      ? buildRoutes(allroutes, fassets, config.routes[el])
      : config.routes[el];
  }

  const navigationOptions = {};
  if (has(config, 'navigationOptions')) {
    Object.assign(navigationOptions, config.navigationOptions);
  }

  return config.navigator(routes, navigationOptions);
}

function filterObjectKeyStartsWith(routes, startsWith) {
  const filtered = Object.keys(routes)
    .filter(key => key.startsWith(startsWith))
    .reduce((obj, key) => {
      obj[key] = routes[key];
      return obj;
    }, {});

  return filtered;
}
