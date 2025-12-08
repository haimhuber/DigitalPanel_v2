import React, { useEffect, useRef } from 'react'

export const Logout = () => {
  const hasLoggedOut = useRef(false);
  
  useEffect(() => {
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;
    
    async function logout() {
      const username = sessionStorage.getItem("username");
      try {
        const usernameAudit = sessionStorage.getItem('username');
        const type = "logout";
        const res = await fetch("api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameAudit, type })
        });
        const data = await res.json();
        console.log(data);

      } catch (err) {
        console.error(err);
      }
      alert(`User: ${username} Log out`);
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("username");
      window.location.href = "/login";
    }
    logout();
  }, []);
  return (

    <div>Logout</div>
  )
}
