// lib/reports/filters.js
/**
 * Creates SQL filter conditions and adds parameters to the request object
 * @param {Object} request - SQL request object
 * @param {Object} filters - Filter parameters
 * @returns {Object} - SQL condition strings
 */
export function createFilterConditions(request, filters) {
    const { classId, courseId, startDate, endDate } = filters;
    
    // Default conditions
    let classCondition = "1=1";
    let courseCondition = "1=1";
    let dateCondition = "1=1";
    
    // Add filters if provided
    if (classId) {
      classCondition = "e.class_id = @classId";
      request.input("classId", parseInt(classId));
    }
    
    if (courseId) {
      courseCondition = "kc.course_id = @courseId";
      request.input("courseId", parseInt(courseId));
    }
    
    if (startDate && endDate) {
      dateCondition = "(kc.created_at BETWEEN @startDate AND @endDate)";
      request.input("startDate", new Date(startDate));
      request.input("endDate", new Date(endDate));
    } else if (startDate) {
      dateCondition = "kc.created_at >= @startDate";
      request.input("startDate", new Date(startDate));
    } else if (endDate) {
      dateCondition = "kc.created_at <= @endDate";
      request.input("endDate", new Date(endDate));
    }
    
    return {
      classCondition,
      courseCondition,
      dateCondition
    };
  }
  
  /**
   * Helper function to format date for display
   */
  export function formatDate(dateString) {
    if (!dateString) return "Belirtilmemiş";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  }