"""Test MongoDB connection and auth flow."""
import asyncio
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

async def main():
    from core.database import Database
    from core.security import get_password_hash, create_access_token
    
    print("1. Connecting to MongoDB...")
    try:
        await Database.connect()
        print("   ✅ Connected successfully")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return
    
    db = Database.get_db()
    
    # List collections
    collections = await db.list_collection_names()
    print(f"2. Collections in DB: {collections}")
    
    # Check users
    users_coll = db['users']
    count = await users_coll.count_documents({})
    print(f"3. Users in DB: {count}")
    
    if count > 0:
        async for u in users_coll.find().limit(5):
            print(f"   - {u.get('email')} (role: {u.get('role')})")
    
    # Try to create admin user
    email = os.getenv("ADMIN_EMAIL", "admin@kairos.local")
    password = os.getenv("ADMIN_PASSWORD")
    if not password:
        print("4. ⚠️  ADMIN_PASSWORD env var not set — skipping user creation/test")
        await Database.close()
        return
    existing = await users_coll.find_one({"email": email})
    
    if existing:
        print(f"4. Admin user already exists: {existing.get('email')}")
    else:
        print(f"4. Creating admin user: {email}")
        hashed = get_password_hash(password)
        await users_coll.insert_one({
            "email": email,
            "hashed_password": hashed,
            "role": "admin",
            "name": "Admin",
        })
        print("   ✅ Admin user created")
    
    # Test login
    from core.security import verify_password
    user = await users_coll.find_one({"email": email})
    if user:
        pw_valid = verify_password(password, user["hashed_password"])
        print(f"5. Password verification: {'✅ OK' if pw_valid else '❌ FAILED'}")
        
        if pw_valid:
            token = create_access_token(
                subject=str(user["_id"]),
                role=user["role"],
                extra_claims={"email": user["email"]}
            )
            print(f"6. JWT token created: {token[:50]}...")
            print(f"7. ✅ Full auth flow works!")
    
    await Database.close()
    print("8. Connection closed.")

if __name__ == "__main__":
    asyncio.run(main())
