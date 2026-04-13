const ADMIN_EMAILS = [
    'kevinkicho@gmail.com',
];

export function isAdmin(user) {
    return user && !user.isAnonymous && ADMIN_EMAILS.includes(user.email);
}
