import React from 'react';
import * as ReactIs from 'react-is';
import { createAspect, launchApp } from 'feature-u';
import has from 'lodash.has';

import verify from './util/verify';

const logf = launchApp.diag.logf.newLogger(
  '- ***feature-react-navigation*** routeAspect: '
);

export default function createRouteAspect(config = {}) {
  // validate parameters
  const check = verify.prefix('createRouteAspect() parameter violation: ');

  check(
    typeof config === 'object',
    `
    config parameter must be an object

    Allowed parameters are : 
    - name type string
    - Navigator type ReactElement
  `
  );

  const { name = 'route', Navigator } = config;

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
      Navigator,
    },
  });
}

/**
 * Control aspect config
 */
function genesis() {
  logf('genesis() validating required config.Navigator');

  if (!this.config.Navigator)
    return `the ${this.name} aspect requires Navigator to be provided`;

  if (!ReactIs.isValidElementType(this.config.Navigator)) {
    return `the ${this.name} aspect requires Navigator to be a valid React Element in createRouteAspect object parameter !`;
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

  // seed the rootAppElm with our StateRouter
  logf(
    `initialRootAppElm() introducing <AppContainer> component into rootAppElm`
  );

  return <Navigator routes={this.routes} />;
}
