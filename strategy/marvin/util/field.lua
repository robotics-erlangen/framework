local Field = {}

--- returns the nearest position inside the field (extended by boundaryWidth)
-- @param pos Vector - the position to limit
-- @param boundaryWidth number - how much the field should be extended beyond the borders
function Field.limitToField(pos, boundaryWidth)
	local extendedFieldWidthHalf = World.Geometry.FieldWidthHalf + boundaryWidth
	local extendedFieldHeightHalf = World.Geometry.FieldHeightHalf + boundaryWidth
	if pos.x < -extendedFieldWidthHalf then
		pos.x = -extendedFieldWidthHalf
	elseif pos.x > extendedFieldHeightHalf then
		pos.x = extendedFieldWidthHalf
	end
	if pos.y < -extendedFieldHeightHalf then
		pos.y = -extendedFieldHeightHalf
	elseif pos.y > extendedFieldHeightHalf then
		pos.y = extendedFieldHeightHalf
	end
	return pos
end

return Field
