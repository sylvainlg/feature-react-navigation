import { createRouteAspect, buildRoutes } from '../index';
import React from 'react';
import { createSwitchNavigator } from '@react-navigation/core';

function createAppContainer() {
  return class AppContainer extends React.Component {};
}
class Test extends React.Component {}

describe('createRouteAspect', () => {
  it('should return an object', () => {
    const aspect = createRouteAspect();

    expect(typeof aspect).toBe('object');
    expect(aspect).toMatchObject(
      expect.objectContaining({
        assembleAspectResources: undefined,
        assembleFeatureContent: expect.any(Function),
        config: expect.any(Object),
        expandFeatureContent: undefined,
        genesis: expect.any(Function),
        initialRootAppElm: expect.any(Function),
        injectRootAppElm: undefined,
        name: expect.any(String),
        validateFeatureContent: expect.any(Function),
      })
    );
  });

  it('name should be route', () => {
    const aspect = createRouteAspect();
    expect(aspect.name).toBe('route');
  });

  it('config should be an object', () => {
    expect(() => createRouteAspect('custom')).toThrow();
  });

  it('name should be custom', () => {
    const aspect = createRouteAspect({ name: 'custom' });
    expect(aspect.name).toBe('custom');
  });

  it("name shouldn't be null", () => {
    expect(() => createRouteAspect(null)).toThrow();
  });

  it("name shouldn't be a number", () => {
    expect(() => createRouteAspect(123)).toThrow();
  });
});

describe('genesis', () => {
  it('should fail without navigationPattern config property', () => {
    // Fail => return string; success => return null
    const aspect = createRouteAspect();

    expect(aspect.genesis()).toBe(
      'the route aspect requires navigationPattern to be configured in createRouteAspect object parameter !'
    );
  });

  it('should fail without createAppFunction config property', () => {
    // Fail => return string; success => return null
    const aspect = createRouteAspect({ navigationPattern: {} });

    expect(aspect.genesis()).not.toBeNull();
  });

  it('should fail with wrong createAppFunction config property (not a function)', () => {
    // Fail => return string; success => return null
    const aspect = createRouteAspect({
      navigationPattern: {},
      createAppFunction: {},
    });

    expect(aspect.genesis()).not.toBeNull();
  });

  it('should success with configuration', () => {
    // Fail => return string; success => return null
    const aspect = createRouteAspect({
      navigationPattern: {},
      createAppFunction: createAppContainer,
    });

    expect(aspect.genesis()).toBe(null);
  });
});

describe('validateFeatureContent', () => {
  const aspect = createRouteAspect();

  it("should be ok when feature don't expose route", () => {
    const feature = {};
    expect(aspect.validateFeatureContent(feature)).toBeNull();
  });

  it("shouldn't be ok when feature expose non object route", () => {
    const feature = { route: 'string' };
    expect(aspect.validateFeatureContent(feature)).toBe(
      'If a feature expose some routing, routes must be exposed under feature.route.routes param'
    );
  });

  it("shouldn't be ok when feature don't expose routes parameter in route object", () => {
    const feature = { route: { routes: 'string' } };
    expect(aspect.validateFeatureContent(feature)).toBe(
      'If a feature expose some routing, routes must be exposed under feature.route.routes param'
    );
  });

  it('should be ok when feature expose routes correctly', () => {
    const feature = { route: { routes: { myroute: { screen: Test } } } };
    expect(aspect.validateFeatureContent(feature)).toBeNull();
  });

  it("shouldn't be ok when feature expose routes with no React Element as value", () => {
    const feature = { route: { routes: { myroute: { screen: null } } } };
    expect(aspect.validateFeatureContent(feature)).toBe(
      'Features routes must have a valid React elements under screen property'
    );
  });
});

describe('assembleFeatureContent', () => {
  it('should succeed when there no features', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, []);
    expect(aspect.routes).toStrictEqual({});
  });

  it('should succeed when there is no routes in any features', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, [{}, {}]);
    expect(aspect.routes).toStrictEqual({});
  });

  it('should succeed when there is no routes in any features (route property defined)', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, [{ route: {} }, {}]);
    expect(aspect.routes).toStrictEqual({});
  });

  it('should succeed when there is no routes in any features (route.routes property defined)', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, [{ route: { routes: {} } }, {}]);
    expect(aspect.routes).toStrictEqual({});
  });

  it('should assemble routes', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
      {},
    ]);
    expect(aspect.routes).toStrictEqual({ myroute: { screen: Test } });
  });

  it('should assemble routes from multiple features', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
      {
        route: { routes: { index: { screen: Test }, home: { screen: Test } } },
      },
    ]);
    expect(aspect.routes).toStrictEqual({
      myroute: { screen: Test },
      index: { screen: Test },
      home: { screen: Test },
    });
  });
});

describe('initialRootAppElm', () => {
  it('should return the same curRootAppElm', () => {
    const aspect = createRouteAspect();
    aspect.genesis();
    aspect.assembleFeatureContent({}, []);
    expect(aspect.routes).toStrictEqual({});
    // Object.keys(obj).length === 0 && obj.constructor === Object
    expect(Object.keys(aspect.routes).length).toBe(0);
    expect(aspect.initialRootAppElm({}, 'dummy')).toBe('dummy');
  });

  it('should throw an error when routes and curRootAppElm are defined', () => {
    const aspect = createRouteAspect();
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, 'dummy')).toThrow();
  });

  it('should throw an error because config.navigationPattern in not defined', () => {
    const aspect = createRouteAspect();
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow();
  });

  it('should throw an error because navigationPattern do not define a navigator', () => {
    const aspect = createRouteAspect({ navigationPattern: {} });
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow(
      'Each level of navigation pattern must define a navigator creator function (key: `navigator`), current: undefined'
    );
  });

  it('should throw an error because there is no routes in the navigationPattern', () => {
    const aspect = createRouteAspect({
      navigationPattern: { navigator: createSwitchNavigator },
    });
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow(
      'feature-react-navigation::buildRoutes : no routes detected, please check your navigationPattern config property and exposed routes from features, actual config value : {}'
    );
  });

  it('should throw an error because routes in the navigationPattern must be Array in order to be expanded', () => {
    const aspect = createRouteAspect({
      navigationPattern: {
        navigator: createSwitchNavigator,
        routes: 'home',
      },
    });
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow(
      'feature-react-navigation::buildRoutes : no routes detected, please check your navigationPattern config property and exposed routes from features, actual config value : {"routes":"home"}'
    );
  });

  it('should throw an error because there is no matching routes in the navigationPattern', () => {
    const aspect = createRouteAspect({
      navigationPattern: {
        navigator: createSwitchNavigator,
        routes: [],
      },
    });
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow(
      'Please specify at least one route when configuring a navigator.'
    );
  });

  it('should throw an error because there is no matching route for home in the navigationPattern', () => {
    const aspect = createRouteAspect({
      navigationPattern: {
        navigator: createSwitchNavigator,
        routes: ['home'],
      },
    });
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow(
      'feature-react-navigation::buildRoutes : expanding route:home failed, route not found'
    );
  });

  it('should throw an error because there is no route in app-home feature in the navigationPattern', () => {
    const aspect = createRouteAspect({
      navigationPattern: {
        navigator: createSwitchNavigator,
        featureRoutes: ['app-home'],
      },
    });
    aspect.genesis();
    aspect.assembleFeatureContent({}, [
      { route: { routes: { myroute: { screen: Test } } } },
    ]);
    expect(() => aspect.initialRootAppElm({}, undefined)).toThrow(
      'Please specify at least one route when configuring a navigator.'
    );
  });
});

describe('complex working sample', () => {
  const config = {
    navigator: createSwitchNavigator,
    routes: {
      startup: {
        navigator: createSwitchNavigator,
        navigationOptions: {
          initialRouteName: 'app.START',
        },
        routes: ['app.START'],
      },
      unauth: {
        navigator: createSwitchNavigator,
        featureRoutes: ['app-login', 'app-subscription'],
      },
      auth: {
        navigator: createSwitchNavigator,
        routes: {
          realytricky: {
            navigator: createSwitchNavigator,
            routes: ['home'],
          },
        },
        featureRoutes: ['app-home', 'app-profil', 'app-offers'],
      },
    },
  };

  const features = [
    { route: { routes: { home: { screen: Test } } } },
    { route: { routes: { 'app.START': { screen: Test } } } },
    {
      route: {
        routes: {
          'app-login.LOGIN': { screen: Test },
          'app-login.LOGIN_SUCCESS': { screen: Test },
        },
      },
    },
    {
      route: {
        routes: {
          'app-subscription.START': { screen: Test },
          'app-subscription.FORM': { screen: Test },
        },
      },
    },
    {
      route: {
        routes: {
          'app-home.HOME': { screen: Test },
        },
      },
    },
    {
      route: {
        routes: {
          'app-profil.SETTINGS': { screen: Test },
          'app-profil.SECURITY': { screen: Test },
        },
      },
    },
    {
      route: {
        routes: {
          'app-offers.LIST': { screen: Test },
          'app-offers.DETAILS': { screen: Test },
        },
      },
    },
  ];

  it('should match snapshot (buildRoutes function)', () => {
    const aspect = createRouteAspect();
    aspect.assembleFeatureContent({}, features);
    const nav = buildRoutes(aspect.routes, {}, config);

    function treeRoutes(routerChildren) {
      if (!routerChildren) {
        return;
      }

      const keys = Object.keys(routerChildren);

      const routes = [];

      keys.map(el => {
        routes.push({
          name: el,
          children: treeRoutes(
            routerChildren[el] ? routerChildren[el].childRouters : undefined
          ),
        });
      });

      return routes;
    }

    const treeGraph = treeRoutes(nav.router.childRouters);

    expect(treeGraph).toMatchSnapshot();
  });

  it('should match the snapshot', () => {
    const aspect = createRouteAspect({
      navigationPattern: config,
      createAppFunction: createAppContainer,
    });

    aspect.genesis();
    aspect.assembleFeatureContent({}, features);
    expect(aspect.initialRootAppElm({}, undefined)).toMatchSnapshot();
  });
});
