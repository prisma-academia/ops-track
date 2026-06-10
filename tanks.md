### Tank Component Integration Task
* Create a dynamic SVG-based cylindrical fuel tank utility component (`FuelTank.tsx`).
* The component must accept `currentLitres` and `maxCapacity` props.
* Use SVG paths to build a 3D isometric cylinder look using `<linearGradient>` profiles for metallic borders and dynamic fluid layers.
* Liquid height must transition smoothly using Tailwind `transition-all duration-500`.
* Change color dynamically: 
    * `> 50%` volume = Emerald Green
    * `20% - 50%` volume = Amber Yellow
    * `< 20%` volume = Destructive Red
* Display clean mathematical readouts underneath the SVG framework showing modern bold typography matching our layout theme.
### Universal Tank Component Adaptations (Fuel & LPG Gas)
* Expand the `FuelTank` visualization into a versatile `AssetTank.tsx` component that processes a variant parameter: `type: 'fuel' | 'gas'`.
* **When type is 'fuel':** Maintain standard flat-profile cylinder vectors suited for liquid commodities like PMS and AGO.
* **When type is 'gas':** Adjust the SVG structural paths to execute a high-pressure bullet capsule shape featuring curved domes (`A 60 40`) at the upper and lower coordinates.
* Overlay a complex translucent shading vector (`url(#metallic-shading)`) over the LPG pressure tank view to correctly imply curved spherical lighting and volumetric depth.