const filterRoutes = ({ features, routes }) => (routesList) => {
  Object.entries(routesList).filter(([routeName]) => {
    if (routes.includes(routeName)) return true;

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (routeName.startsWith(feature)) return true;
    }

    return false;
  });
};

export default filterRoutes;
