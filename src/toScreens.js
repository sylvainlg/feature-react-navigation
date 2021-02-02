import React from 'react';

const toScreens = (Screen, routes) =>
  routes.map(([name, routeConfig]) => {
    const {
      // backward compatibility
      navigationOptions: options,
      screen,
      ...props
    } = routeConfig;

    if (options)
      console.warn(
        'feature-react-navigation: navigationOptions is deprecated in route configuration, use options instead'
      );

    return (
      <Screen
        key={name}
        name={name}
        component={screen}
        options={options || routeConfig.options}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
    );
  });

export default toScreens;
