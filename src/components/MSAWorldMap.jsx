import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

const MANCHESTER = {
  country: 'Manchester, UK',
  latitude: 53.4808,
  longitude: -2.2426,
};
const VIEWBOX = {
  width: 1200,
  height: 620,
};

function buildRoute(origin, destination) {
  const start = [origin.longitude, origin.latitude];
  const end = [destination.longitude, destination.latitude];
  const interpolator = d3.geoInterpolate(start, end);
  const distance = d3.geoDistance(start, end);
  const steps = Math.max(18, Math.ceil(distance * 34));

  return {
    type: 'LineString',
    coordinates: d3.range(steps + 1).map((step) => interpolator(step / steps)),
  };
}

function useOrigins() {
  const [origins, setOrigins] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    d3.csv('/origins.csv', (row) => ({
      country: row.country,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }))
      .then((rows) => {
        if (!cancelled) {
          setOrigins(rows.filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude)));
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrigins([]);
          setError('Unable to load origins.csv');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { origins, error };
}

export default function MSAWorldMap() {
  const mapRef = useRef(null);
  const { origins, error } = useOrigins();
  const [viewMode, setViewMode] = useState('network');
  const [activeCountry, setActiveCountry] = useState('');
  const [tooltip, setTooltip] = useState(null);

  const countries = useMemo(() => feature(world, world.objects.countries).features, []);

  const projection = useMemo(
    () =>
      d3
        .geoNaturalEarth1()
        .rotate([-4, 0])
        .fitExtent(
          [
            [42, 36],
            [VIEWBOX.width - 42, VIEWBOX.height - 36],
          ],
          { type: 'Sphere' },
        ),
    [],
  );

  const path = useMemo(() => d3.geoPath(projection), [projection]);
  const manchesterPoint = projection([MANCHESTER.longitude, MANCHESTER.latitude]);

  const routes = useMemo(
    () =>
      origins.map((origin) => ({
        ...origin,
        route: buildRoute(origin, MANCHESTER),
        point: projection([origin.longitude, origin.latitude]),
      })),
    [origins, projection],
  );

  function showTooltip(event, country) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setActiveCountry(country);
    setTooltip({
      country,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function hideTooltip() {
    setActiveCountry('');
    setTooltip(null);
  }

  return (
    <div className="msa-map" ref={mapRef}>
      <div className="msa-map__controls" aria-label="Map display mode">
        <button
          className={viewMode === 'map' ? 'is-active' : ''}
          type="button"
          aria-pressed={viewMode === 'map'}
          onClick={() => setViewMode('map')}
        >
          Map View
        </button>
        <button
          className={viewMode === 'network' ? 'is-active' : ''}
          type="button"
          aria-pressed={viewMode === 'network'}
          onClick={() => setViewMode('network')}
        >
          Network View
        </button>
      </div>

      <svg
        className={`msa-map__svg msa-map__svg--${viewMode}`}
        role="img"
        aria-label="MSA World diagram showing flows from country origins to Manchester, UK"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      >
        {viewMode === 'map' ? (
          <g className="msa-map__countries" aria-hidden="true">
            {countries.map((country, index) => (
              <path key={country.id ?? index} d={path(country) ?? undefined} />
            ))}
          </g>
        ) : null}

        <g className="msa-map__routes">
          {routes.map((route) => {
            const routePath = path(route.route) ?? undefined;
            const isActive = activeCountry === route.country;

            return (
              <g key={route.country}>
                <path
                  className={`msa-map__arc${isActive ? ' is-active' : ''}`}
                  d={routePath}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="msa-map__arc-hit"
                  d={routePath}
                  vectorEffect="non-scaling-stroke"
                  onPointerMove={(event) => showTooltip(event, route.country)}
                  onPointerLeave={hideTooltip}
                />
              </g>
            );
          })}
        </g>

        <g className="msa-map__origins">
          {routes.map((route) => {
            const isActive = activeCountry === route.country;
            if (!route.point) {
              return null;
            }

            return (
              <circle
                key={route.country}
                className={`msa-map__origin${isActive ? ' is-active' : ''}`}
                cx={route.point[0]}
                cy={route.point[1]}
                r={isActive ? 4 : 2.6}
                vectorEffect="non-scaling-stroke"
                onPointerMove={(event) => showTooltip(event, route.country)}
                onPointerLeave={hideTooltip}
              />
            );
          })}
        </g>

        {manchesterPoint ? (
          <g className="msa-map__destination" transform={`translate(${manchesterPoint[0]} ${manchesterPoint[1]})`}>
            <circle r="9.5" />
            <circle r="3.2" />
          </g>
        ) : null}
      </svg>

      {tooltip ? (
        <div className="msa-map__tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.country}
        </div>
      ) : null}

      {error ? <p className="msa-map__status">{error}</p> : null}
    </div>
  );
}
