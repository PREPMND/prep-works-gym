import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext.jsx';
import {useTheme} from '../hooks/useTheme.js';
import {paths} from '../routes/paths.js';

export function Layout(){
  const {user,isAdmin,logout}=useAuth();
  const {theme,toggle,palette,setPalette,palettes}=useTheme();
  const navigate=useNavigate();

  const signOut=()=>{
    logout();
    navigate(paths.login,{replace:true});
  };

  return (
    <>
      <a href="#main" className="visually-hidden">Skip to main content</a>
      <header className="masthead">
        <div className="masthead__inner">
          <NavLink to={paths.sessions} className="wordmark">Ironworks <em>Gym</em></NavLink>

          <nav className="masthead__nav" aria-label="Main">
            <NavLink to={paths.sessions} className="navlink">Sessions</NavLink>
            <NavLink to={paths.myBookings} className="navlink">My bookings</NavLink>
            {isAdmin?null:<NavLink to={paths.wallet} className="navlink">Wallet</NavLink>}
            {isAdmin?<NavLink to={paths.frontDesk} className="navlink">Front desk</NavLink>:null}
          </nav>

          <div className="whoami">
            <span className="whoami__name">{user?.name}</span>
            <span className="whoami__role">{user?.role}</span>
            <div className="swatches" role="group" aria-label="Colour theme">
              {palettes.map(option=>(
                <button
                  key={option.id}
                  type="button"
                  className="swatch"
                  style={{'--swatch':option.swatch}}
                  onClick={()=>setPalette(option.id)}
                  aria-pressed={palette===option.id}
                  title={option.label}
                >
                  <span className="visually-hidden">{option.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="themetoggle"
              onClick={toggle}
              aria-pressed={theme==='dark'}
            >
              {theme==='dark'?'Light':'Dark'}
            </button>
            <button type="button" className="linkbutton" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main id="main" className="shell">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="shell">
          Times are shown in UTC. Sessions run for one hour and hold twenty people.
        </div>
      </footer>
    </>
  );
}
