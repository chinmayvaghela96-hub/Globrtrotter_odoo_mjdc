import "../styles/dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard">

      {/* ================= NAVBAR ================= */}

      <header className="dashboard-nav">

        <div className="dashboard-logo">
          <div className="dashboard-globe">
            🌐
          </div>

          <span>GlobeTrotter</span>
        </div>


        <nav className="dashboard-links">

          <button className="nav-active">
            Explore
          </button>

          <button>
            My Trips
          </button>

          <button>
            Wishlist
          </button>

        </nav>


        <div className="profile">

          <div className="notification">
            ♡
          </div>

          <div className="profile-avatar">
            M
          </div>

          <div className="profile-name">
            <strong>Manya</strong>
            <span>Traveller</span>
          </div>

        </div>

      </header>


      {/* ================= MAIN ================= */}

      <main className="dashboard-main">


        {/* HERO */}

        <section className="dashboard-welcome">

          <div>

            <p className="welcome-small">
              YOUR TRAVEL SPACE
            </p>

            <h1>
              Where will you go
              <span>next?</span>
            </h1>

            <p className="welcome-description">
              Discover places, build unforgettable trips,
              and make every journey your own.
            </p>

          </div>


          {/* Search */}

          <div className="dashboard-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Search destinations, cities or activities..."
            />

            <button>
              Search
            </button>

          </div>

        </section>


        {/* ================= QUICK ACTIONS ================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>
              <p>START HERE</p>
              <h2>Plan your journey</h2>
            </div>

          </div>


          <div className="quick-actions">


            <button className="quick-card create-trip">

              <div className="quick-icon">
                ✈
              </div>

              <div>
                <h3>Create a trip</h3>

                <p>
                  Start planning your next adventure
                </p>
              </div>

              <span className="card-arrow">
                →
              </span>

            </button>


            <button className="quick-card wishlist-card">

              <div className="quick-icon">
                ♡
              </div>

              <div>
                <h3>Your wishlist</h3>

                <p>
                  Places you've saved for later
                </p>
              </div>

              <span className="card-arrow">
                →
              </span>

            </button>


            <button className="quick-card explore-card">

              <div className="quick-icon">
                ◉
              </div>

              <div>
                <h3>Explore</h3>

                <p>
                  Find your next destination
                </p>
              </div>

              <span className="card-arrow">
                →
              </span>

            </button>

          </div>

        </section>


        {/* ================= YOUR TRIPS ================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>
              <p>YOUR JOURNEYS</p>
              <h2>Continue planning</h2>
            </div>

            <button className="view-all">
              View all →
            </button>

          </div>


          <div className="trip-grid">


            {/* TRIP CARD 1 */}

            <article className="trip-card">

              <div className="trip-image japan-image">

                <span className="trip-status">
                  Planning
                </span>

                <button className="trip-heart">
                  ♡
                </button>

              </div>

              <div className="trip-info">

                <div>

                  <h3>Japan</h3>

                  <p>
                    Tokyo · Kyoto · Osaka
                  </p>

                </div>

                <span className="trip-days">
                  10 days
                </span>

              </div>

              <div className="trip-bottom">

                <strong>
                  ₹85,000
                </strong>

                <button>
                  Continue →
                </button>

              </div>

            </article>


            {/* TRIP CARD 2 */}

            <article className="trip-card">

              <div className="trip-image rajasthan-image">

                <span className="trip-status">
                  Planning
                </span>

                <button className="trip-heart">
                  ♡
                </button>

              </div>

              <div className="trip-info">

                <div>

                  <h3>Rajasthan</h3>

                  <p>
                    Udaipur · Jaipur · Jodhpur
                  </p>

                </div>

                <span className="trip-days">
                  7 days
                </span>

              </div>

              <div className="trip-bottom">

                <strong>
                  ₹32,000
                </strong>

                <button>
                  Continue →
                </button>

              </div>

            </article>


            {/* CREATE CARD */}

            <button className="new-trip-card">

              <div className="new-trip-icon">
                +
              </div>

              <h3>
                Create a new trip
              </h3>

              <p>
                Turn your ideas into an itinerary
              </p>

            </button>

          </div>

        </section>


        {/* ================= DESTINATIONS ================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>
              <p>DISCOVER</p>
              <h2>Destinations for you</h2>
            </div>

            <button className="view-all">
              Explore all →
            </button>

          </div>


          <div className="destination-filters">

            <button className="filter-active">
              Popular
            </button>

            <button>
              Budget Friendly
            </button>

            <button>
              Trending
            </button>

            <button>
              Hidden Gems
            </button>

          </div>


          <div className="destination-grid">


            {/* PARIS */}

            <article className="destination-card">

              <div className="destination-image paris">

                <button className="destination-heart">
                  ♡
                </button>

                <div className="destination-overlay">

                  <h3>Paris</h3>

                  <span>France</span>

                </div>

              </div>

              <div className="destination-info">

                <div className="destination-stats">

                  <span>
                    ★ 95 popularity
                  </span>

                  <span>
                    Cost 78
                  </span>

                </div>

                <button>
                  + Add to trip
                </button>

              </div>

            </article>


            {/* TOKYO */}

            <article className="destination-card">

              <div className="destination-image tokyo">

                <button className="destination-heart">
                  ♡
                </button>

                <div className="destination-overlay">

                  <h3>Tokyo</h3>

                  <span>Japan</span>

                </div>

              </div>

              <div className="destination-info">

                <div className="destination-stats">

                  <span>
                    ★ 92 popularity
                  </span>

                  <span>
                    Cost 82
                  </span>

                </div>

                <button>
                  + Add to trip
                </button>

              </div>

            </article>


            {/* BALI */}

            <article className="destination-card">

              <div className="destination-image bali">

                <button className="destination-heart">
                  ♡
                </button>

                <div className="destination-overlay">

                  <h3>Bali</h3>

                  <span>Indonesia</span>

                </div>

              </div>

              <div className="destination-info">

                <div className="destination-stats">

                  <span>
                    ★ 89 popularity
                  </span>

                  <span>
                    Cost 55
                  </span>

                </div>

                <button>
                  + Add to trip
                </button>

              </div>

            </article>


            {/* SWITZERLAND */}

            <article className="destination-card">

              <div className="destination-image switzerland">

                <button className="destination-heart">
                  ♡
                </button>

                <div className="destination-overlay">

                  <h3>Switzerland</h3>

                  <span>Europe</span>

                </div>

              </div>

              <div className="destination-info">

                <div className="destination-stats">

                  <span>
                    ★ 94 popularity
                  </span>

                  <span>
                    Cost 90
                  </span>

                </div>

                <button>
                  + Add to trip
                </button>

              </div>

            </article>

          </div>

        </section>


        {/* ================= INSPIRATION ================= */}

        <section className="inspiration-banner">

          <div>

            <p>
              TRAVEL DIFFERENTLY
            </p>

            <h2>
              Your journey doesn't
              <br />
              have to look like anyone else's.
            </h2>

            <button>
              Start building your trip →
            </button>

          </div>

          <div className="inspiration-plane">
            ✈
          </div>

        </section>


      </main>

    </div>
  );
}

export default Dashboard;