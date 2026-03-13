"""
Firebase Firestore database operations for SmartPark
Real-time occupancy tracking and historical data
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os
import logging
from typing import Dict, Optional, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FirebaseDB:
    """Firebase Firestore database operations"""
    
    _instance = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Firebase connection"""
        try:
            # Check if Firebase is already initialized
            firebase_admin.get_app()
        except ValueError:
            # Not initialized yet
            cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
            
            if not os.path.exists(cred_path):
                logger.warning(f"⚠ Firebase credentials not found at {cred_path}")
                logger.info("Skipping Firebase initialization (optional)")
                return
            
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self._db = firestore.client()
                logger.info("✓ Firebase Firestore initialized")
            except Exception as e:
                logger.warning(f"⚠ Firebase initialization failed: {e}")
                logger.info("Continuing without Firebase (demo mode)")
    
    def get_db(self):
        """Get Firestore database instance"""
        if self._db is None:
            try:
                self._db = firestore.client()
            except:
                logger.warning("⚠ Firebase not available")
                return None
        return self._db
    
    def update_occupancy(self, lot_id: str, occupancy_data: Dict) -> bool:
        """
        Update parking occupancy in real-time
        
        Args:
            lot_id: Parking lot identifier
            occupancy_data: Dict with occupied and available counts
        
        Returns:
            True if successful, False otherwise
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            doc_ref = db.collection("parking_lots").document(lot_id)
            doc_ref.set({
                "occupancy": occupancy_data,
                "timestamp": datetime.now().isoformat(),
                "occupied_spaces": occupancy_data.get("occupied_count", 0),
                "available_spaces": occupancy_data.get("available_count", 0),
                "occupancy_percentage": occupancy_data.get("percentage", 0),
                "total_spaces": occupancy_data.get("total_spaces", 0)
            }, merge=True)
            
            logger.debug(f"✓ Updated occupancy for {lot_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating occupancy: {e}")
            return False
    
    def get_current_occupancy(self, lot_id: str) -> Optional[Dict]:
        """
        Get current parking status
        
        Args:
            lot_id: Parking lot identifier
        
        Returns:
            Current occupancy data or None
        """
        try:
            db = self.get_db()
            if not db:
                return None
            
            doc = db.collection("parking_lots").document(lot_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error fetching occupancy: {e}")
            return None
    
    def save_occupancy_history(self, lot_id: str, occupancy_data: Dict) -> bool:
        """
        Save historical occupancy data
        
        Args:
            lot_id: Parking lot identifier
            occupancy_data: Occupancy information to log
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("occupancy_history").add({
                "lot_id": lot_id,
                "timestamp": datetime.now().isoformat(),
                **occupancy_data
            })
            
            logger.debug(f"✓ Saved history for {lot_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving history: {e}")
            return False
    
    def get_occupancy_history(self, lot_id: str, limit: int = 100) -> List[Dict]:
        """
        Get historical occupancy data
        
        Args:
            lot_id: Parking lot identifier
            limit: Number of records to fetch
        
        Returns:
            List of historical occupancy records
        """
        try:
            db = self.get_db()
            if not db:
                return []
            
            docs = db.collection("occupancy_history") \
                .where("lot_id", "==", lot_id) \
                .order_by("timestamp", direction=firestore.Query.DESCENDING) \
                .limit(limit) \
                .stream()
            
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error fetching history: {e}")
            return []
    
    def register_parking_space(self, lot_id: str, space_id: str, location: Dict) -> bool:
        """
        Register a parking space
        
        Args:
            lot_id: Parking lot ID
            space_id: Individual space ID
            location: Location coordinates {x, y}
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("parking_lots").document(lot_id) \
                .collection("spaces").document(space_id).set({
                "space_id": space_id,
                "location": location,
                "is_occupied": False,
                "last_updated": datetime.now().isoformat(),
                "confidence": 0.0
            })
            
            return True
        except Exception as e:
            logger.error(f"Error registering space: {e}")
            return False
    
    def update_space_status(self, lot_id: str, space_id: str, 
                           is_occupied: bool, confidence: float) -> bool:
        """
        Update individual parking space status
        
        Args:
            lot_id: Parking lot ID
            space_id: Space ID
            is_occupied: Whether space is occupied
            confidence: Detection confidence (0-1)
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("parking_lots").document(lot_id) \
                .collection("spaces").document(space_id).update({
                "is_occupied": is_occupied,
                "confidence": confidence,
                "last_updated": datetime.now().isoformat()
            })
            
            return True
        except Exception as e:
            logger.error(f"Error updating space status: {e}")
            return False

    # -----------------------------------------------------------------------
    # Parking Complexes
    # -----------------------------------------------------------------------

    def get_parking_complexes(self) -> list:
        """Return all parking complexes from Firestore (falls back to seed data)."""
        try:
            db = self.get_db()
            if not db:
                return self._mock_complexes()

            docs = db.collection("parking_complexes").stream()
            complexes = [doc.to_dict() for doc in docs]
            if not complexes:
                # Seed on first call
                seeded = self._seed_complexes(db)
                return seeded
            return complexes
        except Exception as e:
            logger.error(f"Error fetching complexes: {e}")
            return self._mock_complexes()

    def get_complex_slots(self, complex_id: str) -> list:
        """Return floors/sections/slots for a specific complex."""
        try:
            db = self.get_db()
            if not db:
                complex_data = next(
                    (c for c in self._mock_complexes() if c["id"] == complex_id), None
                )
                return complex_data.get("floors", []) if complex_data else []

            doc = db.collection("parking_complexes").document(complex_id).get()
            if doc.exists:
                return doc.to_dict().get("floors", [])
            return []
        except Exception as e:
            logger.error(f"Error fetching slots for {complex_id}: {e}")
            return []

    def create_booking(self, complex_id: str, booking_data: dict) -> dict:
        """Persist a new booking and mark the slot occupied."""
        try:
            db = self.get_db()
            booking = {
                "bookingId": f"BK-{int(datetime.now().timestamp() * 1000)}",
                "complexId": complex_id,
                **booking_data,
                "status": "confirmed",
                "createdAt": datetime.now().isoformat(),
            }

            if db:
                # Save booking document
                db.collection("bookings").document(booking["bookingId"]).set(booking)
                # Update slot occupancy inside complex document
                complex_ref = db.collection("parking_complexes").document(complex_id)
                # Real-time slot update is best-effort; ignore if structure differs
                try:
                    complex_doc = complex_ref.get()
                    if complex_doc.exists:
                        data = complex_doc.to_dict()
                        floors = data.get("floors", [])
                        slot_id = booking_data.get("slotId")
                        floor_num = booking_data.get("floor")
                        for floor in floors:
                            if floor.get("floorNumber") == floor_num:
                                for section in floor.get("sections", []):
                                    for slot in section.get("slots", []):
                                        if slot.get("id") == slot_id:
                                            slot["available"] = False
                        complex_ref.update({"floors": floors})
                except Exception as inner:
                    logger.warning(f"Could not update slot availability: {inner}")

            logger.info(f"✓ Booking created: {booking['bookingId']}")
            return booking
        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            raise

    def _mock_complexes(self) -> list:
        """In-memory mock complexes used when Firestore is unavailable."""
        def make_slots(section, count, occupied):
            return [
                {"id": f"{section}{i+1}", "row": section, "num": i+1,
                 "available": (i+1) not in occupied}
                for i in range(count)
            ]

        return [
            {
                "id": "complex_001", "name": "Central Mall Parking",
                "address": "123 Main St, Downtown",
                "latitude": 37.7749, "longitude": -122.4194,
                "rating": 4.5, "pricePerHour": 8,
                "totalSlots": 54, "availableSlots": 32,
                "floors": [
                    {"floorNumber": 1, "label": "Ground Floor", "sections": [
                        {"section": "A", "slots": make_slots("A", 9, [2, 5, 7])},
                        {"section": "B", "slots": make_slots("B", 9, [1, 4, 9])},
                        {"section": "C", "slots": make_slots("C", 9, [3, 6])},
                    ]},
                    {"floorNumber": 2, "label": "Level 2", "sections": [
                        {"section": "A", "slots": make_slots("A", 9, [3, 8])},
                        {"section": "B", "slots": make_slots("B", 9, [2, 5])},
                        {"section": "C", "slots": make_slots("C", 9, [1])},
                    ]},
                ],
            },
            {
                "id": "complex_002", "name": "Civic Center Garage",
                "address": "400 Van Ness Ave, Civic Center",
                "latitude": 37.7793, "longitude": -122.4192,
                "rating": 4.1, "pricePerHour": 6,
                "totalSlots": 45, "availableSlots": 18,
                "floors": [
                    {"floorNumber": 1, "label": "Ground Floor", "sections": [
                        {"section": "A", "slots": make_slots("A", 8, [1, 2, 3, 6])},
                        {"section": "B", "slots": make_slots("B", 8, [2, 4, 5, 8])},
                        {"section": "C", "slots": make_slots("C", 8, [1, 3, 7])},
                    ]},
                ],
            },
        ]

    def _seed_complexes(self, db) -> list:
        """Write mock complexes to Firestore and return them."""
        complexes = self._mock_complexes()
        for c in complexes:
            db.collection("parking_complexes").document(c["id"]).set(c)
        logger.info(f"✓ Seeded {len(complexes)} parking complexes")
        return complexes

    # ==================== Client Management ====================

    def create_client_user(self, uid: str, name: str, email: str, phone: str) -> bool:
        """
        Create client user profile in Firestore
        
        Args:
            uid: Firebase UID
            name: Client full name
            email: Client email
            phone: Client phone number
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("clients").document(uid).set({
                "name": name,
                "email": email,
                "phone": phone,
                "created_at": datetime.now().isoformat(),
                "role": "client",
                "active": True
            })
            
            logger.info(f"✓ Created client profile: {email} (UID: {uid})")
            return True
        except Exception as e:
            logger.error(f"Error creating client: {e}")
            return False

    def get_client_by_email(self, email: str) -> Optional[Dict]:
        """
        Get client profile by email
        
        Args:
            email: Client email
        
        Returns:
            Client data dict if found
        """
        try:
            db = self.get_db()
            if not db:
                return None
            
            docs = list(db.collection("clients").where("email", "==", email).stream())
            if docs:
                return docs[0].to_dict()
            return None
        except Exception as e:
            logger.error(f"Error fetching client by email: {e}")
            return None

    def get_client_by_uid(self, uid: str) -> Optional[Dict]:
        """
        Get client profile by Firebase UID
        
        Args:
            uid: Firebase UID
        
        Returns:
            Client data dict if found
        """
        try:
            db = self.get_db()
            if not db:
                return None
            
            doc = db.collection("clients").document(uid).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error fetching client by UID: {e}")
            return None

    def update_client(self, uid: str, data: Dict) -> bool:
        """
        Update client profile
        
        Args:
            uid: Firebase UID
            data: Fields to update
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("clients").document(uid).update(data)
            logger.info(f"✓ Updated client profile: {uid}")
            return True
        except Exception as e:
            logger.error(f"Error updating client: {e}")
            return False

    def delete_client(self, uid: str) -> bool:
        """
        Delete client profile
        
        Args:
            uid: Firebase UID
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("clients").document(uid).delete()
            logger.info(f"✓ Deleted client profile: {uid}")
            return True
        except Exception as e:
            logger.error(f"Error deleting client: {e}")
            return False

    def save_parking_layout(self, lot_id: str, layout_data: Dict) -> bool:
        """
        Save parking space layout (all detected spaces) to Firebase
        
        Args:
            lot_id: Parking lot identifier
            layout_data: Layout data containing spaces and metadata
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                logger.warning("Firebase not available, cannot save parking layout")
                return False
            
            db.collection("parking_layouts").document(lot_id).set(layout_data)
            logger.info(f"✓ Saved parking layout for {lot_id} with {len(layout_data.get('spaces', []))} spaces")
            return True
        except Exception as e:
            logger.error(f"Error saving parking layout: {e}")
            return False

    def get_parking_layout(self, lot_id: str) -> Optional[Dict]:
        """
        Get saved parking layout for a specific lot
        
        Args:
            lot_id: Parking lot identifier
        
        Returns:
            Parking layout dict or None if not found
        """
        try:
            db = self.get_db()
            if not db:
                logger.warning("Firebase not available, cannot get parking layout")
                return None
            
            doc = db.collection("parking_layouts").document(lot_id).get()
            
            if doc.exists:
                logger.info(f"✓ Retrieved parking layout for {lot_id}")
                return doc.to_dict()
            else:
                logger.info(f"No parking layout found for {lot_id}")
                return None
        except Exception as e:
            logger.error(f"Error getting parking layout: {e}")
            return None

    def delete_parking_layout(self, lot_id: str) -> bool:
        """
        Delete parking layout for a specific lot
        
        Args:
            lot_id: Parking lot identifier
        
        Returns:
            True if successful
        """
        try:
            db = self.get_db()
            if not db:
                return False
            
            db.collection("parking_layouts").document(lot_id).delete()
            logger.info(f"✓ Deleted parking layout for {lot_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting parking layout: {e}")
            return False


# Global instance
firebase_db = FirebaseDB()
