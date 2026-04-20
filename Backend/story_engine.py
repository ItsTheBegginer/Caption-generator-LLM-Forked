from typing import List

def build_story(captions: List[str]) -> str:
    if not captions:
        return ""
    
    # Capitalize and clean captions
    cleaned = [c.strip() for c in captions]
    for i in range(len(cleaned)):
        # Remove trailing periods if generated
        if cleaned[i].endswith('.'):
            cleaned[i] = cleaned[i][:-1]
            
    if len(cleaned) == 1:
        return f"{cleaned[0].capitalize()}."
    
    if len(cleaned) == 2:
        return f"It all started when {cleaned[0].lower()}, and then {cleaned[1].lower()}."
        
    story = f"It all started when {cleaned[0].lower()},"
    
    for i in range(1, len(cleaned) - 1):
        story += f" then {cleaned[i].lower()},"
        
    story += f" and finally {cleaned[-1].lower()}."
    
    return story
