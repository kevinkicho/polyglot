import { auth, onAuthStateChanged, googleProvider, signInWithPopup, signOut, signInAnonymously } from '../services/firebase';
import { scoreService } from '../services/scoreService';
import { achievementService } from '../services/achievementService';
import { editorManager } from './EditorManager';

class AuthManager {
    constructor() {
        this.currentUser = null;
    }

    init(onLoginSuccess) {
        const iconOut = document.getElementById('icon-user-out'); 
        const iconIn = document.getElementById('icon-user-in'); 
        // FIX: Add referrer policy to allow Google profile images to load
        if (iconIn) iconIn.referrerPolicy = "no-referrer";
        
        const loginBtn = document.getElementById('user-login-btn');

        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            if (user) { 
                if(!user.isAnonymous) {
                    if(iconOut) iconOut.classList.add('hidden'); 
                    if(iconIn) { 
                        iconIn.classList.remove('hidden'); 
                        // Use a fallback if photoURL is missing
                        iconIn.src = user.photoURL || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiAvPjxwYXRoIGQ9Ik0xMiAxNGE0IDQgMCAxIDAtOCA0IDQgMCAwIDEgOCAweiIgLz48L3N2Zz4='; 
                    }
                }
                if(onLoginSuccess) await onLoginSuccess(user);
            } else { 
                try { await signInAnonymously(auth); } catch(e) { console.error("Auth Error", e); } 
                if(iconOut) iconOut.classList.remove('hidden'); 
                if(iconIn) iconIn.classList.add('hidden'); 
            }
            editorManager.updatePermissions(user);
        });

        if (loginBtn) {
            loginBtn.addEventListener('click', async () => { 
                if (this.currentUser && !this.currentUser.isAnonymous) { 
                    if(confirm("Log out?")) await signOut(auth); 
                } else { 
                    this.handleLoginMigration();
                } 
            });
        }
    }

    async handleLoginMigration() {
        try {
            // 1. Capture data BEFORE switching auth
            let oldData = null;
            if (this.currentUser && this.currentUser.isAnonymous) {
                oldData = await scoreService.getSnapshot();
                console.log("Preserving anonymous data...", oldData);
            }

            // 2. Sign In
            await signInWithPopup(auth, googleProvider); 
            
            // 3. Migrate Data if we have it
            if (oldData) {
                console.log("Migrating data to new user...");
                await scoreService.migrateStats(oldData);
                alert("Your progress has been transferred to your Google account.");
            }
        } catch(e) {
            console.error("Login/Migration Error", e);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

export const authManager = new AuthManager();
