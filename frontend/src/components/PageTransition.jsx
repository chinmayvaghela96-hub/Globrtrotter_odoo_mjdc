import "../styles/page-transition.css";

function PageTransition({ show }) {
  if (!show) {
    return null;
  }

  return (
    <div className="page-transition">

      {/* Faint scenery only */}
      <div className="transition-scenery" />

      <svg
        className="transition-flight-svg"
        viewBox="0 0 700 300"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >

        {/* =================================================
            THE ONE AND ONLY FLIGHT PATH

            Both the plane and trail use this exact path.
        ================================================= */}

        <path
          id="flightPath"
          d="
            M 70 205

            C 130 165,
              165 225,
              230 195

            C 285 170,
              280 105,
              330 115

            C 375 125,
              360 185,
              410 195

            C 475 210,
              520 160,
              590 90
          "
          pathLength="1000"
          fill="none"
        />


        {/* =================================================
            TRAIL

            Starts completely invisible.
            It begins drawing AFTER the plane has started.
        ================================================= */}

        <path
          className="flight-trail"
          d="
            M 70 205

            C 130 165,
              165 225,
              230 195

            C 285 170,
              280 105,
              330 115

            C 375 125,
              360 185,
              410 195

            C 475 210,
              520 160,
              590 90
          "
          pathLength="1000"
          fill="none"
        />


        {/* =================================================
            PAPER PLANE

            It follows the EXACT SAME path.
        ================================================= */}

        <g className="transition-plane">

          <g transform="translate(-28 -20) scale(0.56)">

            <path
              d="M6 32 L94 5 L57 65 L43 42 Z"
              fill="#E5AA64"
            />

            <path
              d="M43 42 L94 5 L51 48 Z"
              fill="#F4CA91"
            />

            <path
              d="M43 42 L51 48 L57 65 Z"
              fill="#C88C4B"
            />

          </g>

          <animateMotion
            dur="1.8s"
            begin="0.05s"
            fill="freeze"
            rotate="auto"
          >
            <mpath href="#flightPath" />
          </animateMotion>

          <animate
            attributeName="opacity"
            values="0;1;1"
            keyTimes="0;0.08;1"
            dur="1.8s"
            begin="0.05s"
            fill="freeze"
          />

        </g>

      </svg>

    </div>
  );
}

export default PageTransition;